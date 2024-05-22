import Phaser from "phaser";
import React, {useEffect, useRef, useState} from "react";
import shipImg from "./assets/ship.png";
import playerSprite from "./assets/player.png";
import SockJS from 'sockjs-client';
import Stomp from 'webstomp-client';
import taskImg from "./assets/task.png";
import {
    PLAYER_SPRITE_HEIGHT,
    PLAYER_SPRITE_WIDTH,
    PLAYER_START_X,
    PLAYER_START_Y,
    PLAYER_HEIGHT,
    PLAYER_WIDTH,
    TASK_POSITIONS,
    EMERGENCY_TASK_POSITIONS
} from "./constants";
import {useNavigate} from "react-router-dom";
import axios from "axios";
import {useWebSocket} from "../../Context/WebSocketContext";


const Game = () => {

    const jwtToken = sessionStorage.getItem('jwtToken');
    const sessionId = sessionStorage.getItem('sessionId');
    const playerId = sessionStorage.getItem('playerId');
    const roomId = sessionStorage.getItem('roomId');
    const username = sessionStorage.getItem('username');
    const players = useRef(new Map());
    const [roles, setRoles] = useState([]);
    const pressedKeys = useRef([]);

    const navigate = useNavigate();
    const movementStompClientRef = useRef(null)
    const { stompClient: emergencyStompClient, isConnected } = useWebSocket();




    useEffect(() => {

        const config = {
            type: Phaser.WEBGL,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: 'game-container',
            scene: {
                preload: preload,
                create: create,
                update: update
            }
        };



        const game = new Phaser.Game(config);

        function preload() {
            const socket = new SockJS('http://localhost:8082/ws/movement');
            movementStompClientRef.current = Stomp.over(socket);

            this.load.image('ship', shipImg);
            this.load.spritesheet('player', playerSprite, {
                frameWidth: PLAYER_SPRITE_WIDTH,
                frameHeight: PLAYER_SPRITE_HEIGHT
            });

            this.load.spritesheet('otherPlayer', playerSprite, {
                frameWidth: PLAYER_SPRITE_WIDTH,
                frameHeight: PLAYER_SPRITE_HEIGHT,
            });

            this.load.image('task', taskImg);
            this.load.image('emergencyButton', taskImg);
        }

        function create() {
            const scene = this;
            this.ship = this.add.image(0, 0, 'ship');
           /* players.sprite = this.add.sprite(PLAYER_START_X, PLAYER_START_Y, 'player');
            player.sprite.displayHeight = PLAYER_HEIGHT;
            player.sprite.displayWidth = PLAYER_WIDTH;*/


            const localPlayerRole = roles.find(p => p.playerId.toString() === playerId)?.role;
            const localPlayer = createPlayerSprite(scene, sessionId, username, localPlayerRole, localPlayerRole);
            players.current.set(sessionId, localPlayer);

            TASK_POSITIONS.forEach((pos) => {
                const task = this.add.image(pos.x, pos.y, 'task');
                task.setScale(0.03);
                task.setInteractive();
                task.on('pointerdown', () => {
                    showTaskPopup(this, task);

                });
            });

            this.anims.create({
                key: 'running',
                frames: this.anims.generateFrameNumbers('player'),
                frameRate: 24,
                repeat: -1
            });

            this.input.keyboard.on('keydown', (event) => {
                if (!pressedKeys.current.includes(event.code)) {
                    pressedKeys.current.push(event.code);
                }
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
                    event.preventDefault();
                }
            });

            this.input.keyboard.on('keyup', (event) => {
                pressedKeys.current = pressedKeys.current.filter((key) => key !== event.code);
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
                    event.preventDefault();
                }
            });

            movementStompClientRef.current.connect({}, () => {


                movementStompClientRef.current.subscribe(`/topic/move/${roomId}`, (message) => {
                    const playerPosition = JSON.parse(message.body);
                    console.log('This is the player position from the server: ' + playerPosition);
                    console.log('This is the session ID from the server: ' + playerPosition.sessionId);
                    console.log('This is the session ID from the client: ' + sessionId);
                    console.log('Position of local player: ' + players.current.sprite.x + ' ' + players.current.sprite.y);
                    console.log('All players: ' + players.current.size);

                if (playerPosition.sessionId) {
                    const playerRole = roles.find(p => p.playerId === playerPosition.playerId)?.role;
                    if (players.current.has(playerPosition.sessionId)) {
                        let playerData = players.current.get(playerPosition.sessionId);
                        let playerSprite = playerData.sprite;
                        if (playerPosition.newPositionX < playerSprite.x) {
                            playerSprite.setFlipX(true);
                        } else if (playerPosition.newPositionX > playerSprite.x) {
                            playerSprite.setFlipX(false);
                        }
                        playerSprite.x = playerPosition.newPositionX;
                        playerSprite.y = playerPosition.newPositionY;
                        playerSprite.moving = true;
                    } else {
                        const newPlayer = createPlayerSprite(scene, playerPosition.sessionId, playerPosition.username, playerRole, localPlayerRole);
                        players.current.set(playerPosition.sessionId, newPlayer);
                    }
                }
                });

                movementStompClientRef.current.subscribe(`/topic/join/${roomId}`, (message) => {
                    const playerData = JSON.parse(message.body);
                    if (!players.current.has(playerData.sessionId)) {
                        const newPlayer = createPlayerSprite(scene, playerData.sessionId, playerData.username, playerData.role, localPlayerRole);
                        players.current.set(playerData.sessionId, newPlayer);
                    }
                });
                movementStompClientRef.current.subscribe(`/topic/moveEnd/${roomId}`, (message) => {
                    const endMove = JSON.parse(message.body);
                    const playerData = players.current.get(endMove.sessionId);
                    if (playerData) {
                        playerData.sprite.moving = false;
                    }
                });
                movementStompClientRef.current.subscribe('/topic/leave', (message) => {
                    const disconnectedPlayer = JSON.parse(message.body);
                    removePlayerSprite(disconnectedPlayer.sessionId);
                });
            });

                if (isConnected) {
                    console.log('Emergency is being called');
                    emergencyStompClient.subscribe(`/topic/emergencyMeeting/${roomId}`, () => {
                        navigate('/chat');
                    });
                }

            function createPlayerSprite(scene, sessionId, playerRole) {
                let newPlayerSprite = scene.add.sprite(PLAYER_START_X, PLAYER_START_Y, 'player');
                newPlayerSprite.displayHeight = PLAYER_HEIGHT;
                newPlayerSprite.displayWidth = PLAYER_WIDTH;
                newPlayerSprite.moving = false;
                newPlayerSprite.role = playerRole;
                players.current.set(sessionId, newPlayerSprite);


                movementStompClientRef.current.send('/app/join', JSON.stringify({
                    token: jwtToken,
                    sessionId: sessionId,
                    username: username,
                    roomId: roomId
                }), {});

                return newPlayerSprite;
            }
        }

        function update() {
            this.scene.scene.cameras.main.centerOn(players.current.get(sessionId).sprite.x, players.current.get(sessionId).sprite.y);

            players.current.forEach((playerData) => {
                if (playerData.sprite && playerData.text) {
                    const { x, y } = playerData.sprite;
                    if (playerData.text.x !== x || playerData.text.y !== y - 50) {
                        playerData.text.setPosition(x, y - 50);
                    }
                }
            });

            const playerMoved = movePlayer(pressedKeys.current, players.current.get(sessionId).sprite);
            if (playerMoved) {
                players.current.get(sessionId).movedLastFrame = true;
            } else {
                if (players.current.get(sessionId).movedLastFrame) {
                    if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                        movementStompClientRef.current.send('/app/moveEnd', JSON.stringify({
                            token: jwtToken,
                            sessionId: sessionId,
                            roomId: roomId
                        }), {});
                    }
                    players.current.get(sessionId).movedLastFrame = false;
                }
            }

            animateMovement(pressedKeys.current, players.current.get(sessionId).sprite);
            players.current.forEach((playerData) => {
                if (playerData.sprite.moving && !playerData.sprite.anims.isPlaying) {
                    playerData.sprite.play('running');
                } else if (!playerData.sprite.moving && playerData.sprite.anims.isPlaying) {
                    playerData.sprite.stop('running');
                }
            });
        }

        function movePlayer(pressedKeys, sprite) {
            let playerMoved = false;
            if (pressedKeys.includes('ArrowUp')) {
                sendMove('UP', sprite.flipX);
                playerMoved = true;
            } else if (pressedKeys.includes('ArrowDown')) {
                sendMove('DOWN', sprite.flipX);
                playerMoved = true;
            } else if (pressedKeys.includes('ArrowLeft')) {
                sprite.setFlipX(true);
                sendMove('LEFT', true);
                playerMoved = true;
            } else if (pressedKeys.includes('ArrowRight')) {
                sprite.setFlipX(false);
                sendMove('RIGHT', false);
                playerMoved = true;
            }
            return playerMoved;
        }

        function sendMove(direction, flip) {
            if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                movementStompClientRef.current.send('/app/move', JSON.stringify({
                    playerId: playerId,
                    direction: direction,
                    positionX: players.current.sprite.x,
                    positionY: players.current.sprite.y,
                    flip: flip,
                    roomId: roomId,
                    sessionId: sessionId
                }), {});
            }
        }

        function animateMovement(keys, sprite) {
            const runningKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (keys.some((key) => runningKeys.includes(key)) && !sprite.anims.isPlaying) {
                sprite.play('running');
            } else if (!keys.some((key) => runningKeys.includes(key)) && sprite.anims.isPlaying) {
                sprite.stop('running');
            }
        }

        function createPlayerSprite(scene, sessionId, username, role, localPlayerRole) {
            console.log('Creating player sprite with username:', username, 'and role:', role)
            let newPlayerSprite = scene.add.sprite(PLAYER_START_X, PLAYER_START_Y, 'player');
            newPlayerSprite.displayHeight = PLAYER_HEIGHT;
            newPlayerSprite.displayWidth = PLAYER_WIDTH;
            newPlayerSprite.moving = false;

            // Determine text color based on role
            let textColor = '#ffffff'; // Default to white
            if (localPlayerRole === 'IMPOSTER') {
                textColor = role === 'IMPOSTER' ? '#ff0000' : '#ffffff'; // Imposter sees other imposters in red
            } else if (localPlayerRole === 'CREWMATE') {
                textColor = '#ffffff'; // Crewmates see everyone in white
            }

            let newPlayerText = scene.add.text(PLAYER_START_X, PLAYER_START_Y - 50, username, {
                fontSize: '20px',
                color: textColor,
                align: 'center',
                fontStyle: 'bold', // Make the text bold
                stroke: '#000000', // Add a black stroke (outline) to the text
                strokeThickness: 3, // Set the thickness of the stroke
                shadow: {
                    offsetX: 2, // Set the horizontal offset of the shadow
                    offsetY: 2, // Set the vertical offset of the shadow
                    color: '#000000', // Set the color of the shadow
                    blur: 4, // Set the blur level of the shadow

                }
            }).setOrigin(0.5, 0.5).setDepth(1);

            //Add the player text to the playersprite
            newPlayerSprite.text = username;

            return {
                sprite: newPlayerSprite,
                text: newPlayerText,
                sessionId: sessionId,
                username: username
            };
        }

        function showTaskPopup(scene, task) {
            const cam = scene.cameras.main;
            const bg = scene.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.5 } });
            bg.fillRect(0, 0, cam.width, cam.height);
            bg.setScrollFactor(0);
            const popup = scene.add.rectangle(cam.centerX, cam.centerY, 200, 150, 0xffffff);
            popup.setScrollFactor(0);
            const text = scene.add.text(cam.centerX, cam.centerY - 20, 'Task Status', { fontSize: '16px', color: '#000' }).setOrigin(0.5);
            text.setScrollFactor(0);
            const finishButton = scene.add.text(cam.centerX - 80, cam.centerY + 20, 'Finish', { fontSize: '18px', color: '#00ff00' }).setInteractive();
            finishButton.setScrollFactor(0);
            finishButton.on('pointerdown', () => {
                bg.destroy();
                popup.destroy();
                text.destroy();
                closeButton.destroy();
                finishButton.destroy();
                task.destroy();
            });
            const closeButton = scene.add.text(cam.centerX + 40, cam.centerY + 20, 'Close', { fontSize: '18px', color: '#ff0000' }).setInteractive();
            closeButton.setScrollFactor(0);
            closeButton.on('pointerdown', () => {
                bg.destroy();
                popup.destroy();
                text.destroy();
                closeButton.destroy();
                   finishButton.destroy();
            });
        }

        function removePlayerSprite(sessionId) {
            let playerData = players.current.get(sessionId);
            if (playerData) {
                playerData.sprite.destroy();
                playerData.text.destroy();
                players.current.delete(sessionId);
            }
        }

        return () => {
            if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                movementStompClientRef.current.disconnect();
            }
            game.destroy(true);
        };
    }, [jwtToken, player, playerId, roles, roomId, sessionId, username, navigate]);


    return(
        <div id="game-container">

            <canvas/>
        </div>
    );
}

export default Game;
