import Phaser from "phaser";
import React, {useEffect, useRef, useState} from "react";
import shipImg from "./assets/ship.png";
import playerSprite from "./assets/player.png";
import SockJS from 'sockjs-client';
import Stomp from 'webstomp-client';
import taskImg from "./assets/task.png";
import killBtnEnabledImg from "./assets/kill-btn-enabled.png";
import killBtnDisabledImg from "./assets/kill-btn-disabled.png";
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
    const player = useRef({});
    const players = useRef(new Map());
    const [roles, setRoles] = useState([]);
    const pressedKeys = useRef([]);
    const [killBtnDisabled, setKillBtnDisabled] = useState(false);
    const navigate = useNavigate();
    const movementStompClientRef = useRef(null)
    const {stompClient: emergencyStompClient, isConnected} = useWebSocket();
    const [isKillBtnEnabled, setIsKillBtnEnabled] = useState(false);

    // Function to handle elimination
    async function updateElimination(player, action, targetPlayer) {
        try {
            const response = await axios.post('http://localhost:8080/api/player/action', {
                player: player,
                action: action,
                targetPlayer: targetPlayer
            });
            console.log('Action performed successfully:', response.data);
        } catch (error) {
            console.error('Error performing action:', error);
        }
    }

    // Example function to handle elimination button click
    const handleEliminationClick = () => {
        const action = 'eliminate'; // Define the action type
        const targetPlayer = {id: 'targetPlayerId'}; // Define the target player
        updateElimination(player.current, action, targetPlayer).then(r => console.log('Player eliminated'));
    };

    useEffect(() => {
        fetchRoles().then(r => console.log('Roles fetched'));

        if (movementStompClientRef.current) {
            movementStompClientRef.current.subscribe(`/topic/nearPlayer/${roomId}`, (message) => {
                const nearPlayer = JSON.parse(message.body);
                console.log('Near player:', nearPlayer);
                setIsKillBtnEnabled(nearPlayer);
                const killButton = document.getElementById('elimination-button');
                if (nearPlayer) {
                    killButton.style.display = 'block';
                } else {
                    killButton.style.display = 'none';
                }
            });
        }

        const handleBeforeUnload = (e) => {
            if (!isReadyToNavigate) {
                setIsModalOpen(true);
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

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
            this.ship = this.add.image(0, 0, 'ship');
            player.current.sprite = this.add.sprite(PLAYER_START_X, PLAYER_START_Y, 'player');
            player.current.sprite.displayHeight = PLAYER_HEIGHT;
            player.current.sprite.displayWidth = PLAYER_WIDTH;
            player.current.role = roles.find(p => p.id.toString() === playerId)?.role;

            if (player.current.role === 'IMPOSTER') {
                console.log('This role should be Imposter: ' + player.current.role)
                player.current.text = this.add.text(PLAYER_START_X, PLAYER_START_Y - 50, username, {
                    fontSize: '20px',
                    color: '#ff0000',
                    align: 'center'
                }).setOrigin(0.5, 0.5);
            } else {
                console.log('This role should be Crewmate: ' + player.current.role)
                player.current.text = this.add.text(PLAYER_START_X, PLAYER_START_Y - 50, username, {
                    fontSize: '20px',
                    color: '#127cd9',
                    align: 'center'
                }).setOrigin(0.5, 0.5);
            }

            const emergencyButtonPos = EMERGENCY_TASK_POSITIONS[0]; // Assuming there's at least one position
            const emergencyButton = this.add.image(emergencyButtonPos.x, emergencyButtonPos.y, 'emergencyButton');
            emergencyButton.setScale(0.03);
            emergencyButton.setInteractive();
            emergencyButton.on('pointerdown', () => {
                if (isConnected) {
                    console.log('Emergency button clicked');
                    emergencyStompClient.send(`/app/emergencyMeeting/${roomId}`, () => {
                    });
                }
            });

            TASK_POSITIONS.forEach((pos) => {
                const task = this.add.image(pos.x, pos.y, 'task');
                task.setScale(0.03);
                task.setInteractive();
                task.on('pointerdown', () => {
                    showTaskPopup(this, task);
                });
            });

            function showTaskPopup(scene, task) {
                const cam = scene.cameras.main;

                // Background overlay
                const bg = scene.add.graphics({fillStyle: {color: 0x000000, alpha: 0.5}});
                bg.fillRect(0, 0, cam.width, cam.height);
                bg.setScrollFactor(0);

                // Popup window
                const popup = scene.add.rectangle(cam.centerX, cam.centerY, 200, 150, 0xffffff);
                popup.setScrollFactor(0);

                // Task instructions or status text
                const text = scene.add.text(cam.centerX, cam.centerY - 20, 'Task Status', {
                    fontSize: '16px',
                    color: '#000'
                }).setOrigin(0.5);
                text.setScrollFactor(0);

                // Finish button
                const finishButton = scene.add.text(cam.centerX - 80, cam.centerY + 20, 'Finish', {
                    fontSize: '18px',
                    color: '#00ff00'
                }).setInteractive();
                finishButton.setScrollFactor(0);
                finishButton.on('pointerdown', () => {
                    bg.destroy();
                    popup.destroy();
                    text.destroy();
                    closeButton.destroy();
                    finishButton.destroy();
                    task.destroy();  // Removes the task from the map
                });

                // Close button
                const closeButton = scene.add.text(cam.centerX + 40, cam.centerY + 20, 'Close', {
                    fontSize: '18px',
                    color: '#ff0000'
                }).setInteractive();
                closeButton.setScrollFactor(0);
                closeButton.on('pointerdown', () => {
                    bg.destroy();
                    popup.destroy();
                    text.destroy();
                    closeButton.destroy();
                    finishButton.destroy();
                    // Task remains on the map
                });
            }

            // Capture keyboard input
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
                    event.preventDefault();  // Prevent the default action (scrolling)
                }
            });

            players.current.set(sessionId, player.current.sprite);

            this.anims.create({
                key: 'running',
                frames: this.anims.generateFrameNumbers('player'),
                frameRate: 24,
                repeat: -1
            });

            movementStompClientRef.current.connect({}, () => {
                movementStompClientRef.current.subscribe(`/topic/move/${roomId}`, (message) => {
                    const playerPosition = JSON.parse(message.body);
                    if (playerPosition.sessionId) {
                        if (players.current.has(playerPosition.sessionId)) {
                            let playerSprite = players.current.get(playerPosition.sessionId);
                            if (playerPosition.newPositionX < playerSprite.x) { // Moving left
                                playerSprite.setFlipX(true);
                            } else if (playerPosition.newPositionX > playerSprite.x) { // Moving right
                                playerSprite.setFlipX(false);
                            }

                            playerSprite.x = playerPosition.newPositionX;
                            playerSprite.y = playerPosition.newPositionY;
                            playerSprite.moving = true;

                        } else if (playerPosition.sessionId !== sessionId) {
                            createPlayerSprite(this, playerPosition.sessionId, playerPosition.newPositionX, playerPosition.newPositionY);
                            let newPlayerSprite = players.current.get(playerPosition.sessionId);
                            newPlayerSprite.setFlipX(playerPosition.flip);
                        }
                    } else {
                        console.log('No session ID found in message:');
                    }
                });

                movementStompClientRef.current.subscribe(`/topic/moveEnd/${roomId}`, (message) => {
                    const endMove = JSON.parse(message.body);
                    const playerSprite = players.current.get(endMove.sessionId);
                    if (playerSprite) {
                        playerSprite.moving = false;
                    }
                });

                movementStompClientRef.current.subscribe('/topic/leave', (message) => {
                    const disconnectedPlayer = JSON.parse(message.body);
                    removePlayerSprite(disconnectedPlayer.sessionId);
                });
            });

            if (isConnected) {
                emergencyStompClient.subscribe(`/topic/emergencyMeeting/${roomId}`, () => {
                    navigate('/chat');
                });
            }
        }

        function update() {
            this.scene.scene.cameras.main.centerOn(player.current.sprite.x, player.current.sprite.y);

            if (player.current.sprite && player.current.text) {
                player.current.text.setPosition(player.current.sprite.x, player.current.sprite.y - 50);
            }

            const playerMoved = movePlayer(pressedKeys.current, player.current.sprite);

            if (playerMoved) {
                player.current.movedLastFrame = true;
            } else {
                if (player.current.movedLastFrame) {
                    if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                        movementStompClientRef.current.send('/app/moveEnd', JSON.stringify({
                            username: username,
                            roomId: roomId,
                            sessionId: sessionId
                        }), {});
                    }
                    player.current.movedLastFrame = false;
                }
            }

            animateMovement(pressedKeys.current, player.current.sprite);

            players.current.forEach((playerSprite, sessionId) => {
                if (sessionId !== sessionStorage.getItem('sessionId')) {
                    if (playerSprite.moving && !playerSprite.anims.isPlaying) {
                        playerSprite.play('running');
                    } else if (!playerSprite.moving && playerSprite.anims.isPlaying) {
                        playerSprite.stop('running');
                    }
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
                    positionX: player.current.sprite.x,
                    positionY: player.current.sprite.y,
                    flip: flip,
                    roomId: roomId,
                    sessionId: sessionId
                }), {});
            }
        }

        function animateMovement(keys, player) {
            const runningKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

            if (keys.some((key) => runningKeys.includes(key)) && !player.anims.isPlaying) {
                player.play('running');
            } else if (!keys.some((key) => runningKeys.includes(key)) && player.anims.isPlaying) {
                player.stop('running');
            }
        }

        function removePlayerSprite(sessionId) {
            let playerSprite = players.current.get(sessionId);
            if (playerSprite) {
                playerSprite.destroy();
                players.current.delete(sessionId);
            }
        }

        async function fetchRoles() {
            try {
                const response = await axios.post('http://localhost:8080/player/assignRoles', {
                    token: jwtToken,
                    sessionId: sessionId
                })
                console.log('Roles assigned:', response);
                const roles = response.data.players.map(player => ({id: player.playerId, role: player.role}));
                console.log('Roles:', roles);
                setRoles(roles);
            } catch (error) {
                console.error('Error fetching roles:', error);
            }
        }

        return () => {
            if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                movementStompClientRef.current.disconnect();
            }
            game.destroy(true);
        };
    }, [jwtToken, playerId, roles, roomId, sessionId, username, navigate, isConnected, emergencyStompClient]);

    return (
        <div id="game-container">
            <img
                id="elimination-button"
                src={isKillBtnEnabled ? killBtnEnabledImg : killBtnDisabledImg}
                alt="Eliminate"
                onClick={isKillBtnEnabled ? handleEliminationClick : null}
                style={{display: isKillBtnEnabled ? 'block' : 'none'}}
            />
            <canvas/>
        </div>
    );
}

export default Game;
