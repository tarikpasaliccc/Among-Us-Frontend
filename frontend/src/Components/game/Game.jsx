import Phaser from "phaser";
import React, { useEffect, useRef, useState } from "react";
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
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useWebSocket } from "../../Context/WebSocketContext";

const Game = () => {
    const jwtToken = sessionStorage.getItem('jwtToken');
    const sessionId = sessionStorage.getItem('sessionId');
    const playerId = sessionStorage.getItem('playerId');
    const roomId = sessionStorage.getItem('roomId');
    const username = sessionStorage.getItem('username');
    const role = sessionStorage.getItem('role');
    const players = useRef(new Map());
    const [roles, setRoles] = useState([]);
    const pressedKeys = useRef([]);
    const [isKillBtnEnabled, setIsKillBtnEnabled] = useState(false);
    const navigate = useNavigate();
    const movementStompClientRef = useRef(null)
    const gameRoomStompClientRef = useRef(null);
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

            const gameRoomSocket = new SockJS('http://localhost:8081/ws/gameRoom');
            gameRoomStompClientRef.current = Stomp.over(gameRoomSocket);

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
            this.load.image('killBtnEnabled', killBtnEnabledImg);
            this.load.image('killBtnDisabled', killBtnDisabledImg);
        }

        function create() {
            const scene = this;
            this.ship = this.add.image(0, 0, 'ship');
            this.killBtn = this.add.image(1200, 600, 'killBtnEnabled');
            this.killBtn.setInteractive();
            this.killBtn.setScale(0.03);
            this.killBtn.setScrollFactor(0);

            //const localPlayerRole = roles.find(p => p.playerId.toString() === playerId)?.role;
            const localPlayer = createPlayerSprite(scene, sessionId, username, role);
            players.current.set(sessionId, localPlayer);

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
                    console.log('Received player position from server:', playerPosition);

                    const playerData = players.current.get(playerPosition.sessionId);
                    if (playerData) {
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
                        const playerRole = roles.find(p => p.playerId === playerPosition.playerId)?.role;
                        const newPlayer = createPlayerSprite(scene, playerPosition.sessionId, playerPosition.username, playerRole);
                        players.current.set(playerPosition.sessionId, newPlayer);
                    }
                });

                gameRoomStompClientRef.current.subscribe(`/topic/join/${roomId}`, (message) => {
                    const playerData = JSON.parse(message.body);
                    if (!players.current.has(playerData.sessionId)) {
                        const newPlayer = createPlayerSprite(scene, playerData.sessionId, playerData.username, playerData.role);
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
        }

        function update() {
            const localPlayerData = players.current.get(sessionId);
            if (localPlayerData && localPlayerData.sprite) {
                this.scene.scene.cameras.main.centerOn(localPlayerData.sprite.x, localPlayerData.sprite.y);

                players.current.forEach((playerData) => {
                    if (playerData.sprite && playerData.text) {
                        const { x, y } = playerData.sprite;
                        if (playerData.text.x !== x || playerData.text.y !== y - 50) {
                            playerData.text.setPosition(x, y - 50);
                        }
                    }
                });

                const playerMoved = movePlayer(pressedKeys.current, localPlayerData.sprite);
                if (playerMoved) {
                    localPlayerData.movedLastFrame = true;
                } else {
                    if (localPlayerData.movedLastFrame) {
                        if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                            movementStompClientRef.current.send('/app/moveEnd', JSON.stringify({
                                token: jwtToken,
                                sessionId: sessionId,
                                roomId: roomId
                            }), {});
                        }
                        localPlayerData.movedLastFrame = false;
                    }
                }

                animateMovement(pressedKeys.current, localPlayerData.sprite);
                players.current.forEach((playerData) => {
                    if (playerData.sprite.moving && !playerData.sprite.anims.isPlaying) {
                        playerData.sprite.play('running');
                    } else if (!playerData.sprite.moving && playerData.sprite.anims.isPlaying) {
                        playerData.sprite.stop('running');
                    }
                });
            } else {
                console.warn('Local player data or sprite is undefined');
            }
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
            const localPlayerData = players.current.get(sessionId);
            if (localPlayerData && localPlayerData.sprite) {
                if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                    movementStompClientRef.current.send('/app/move', JSON.stringify({
                        playerId: playerId,
                        direction: direction,
                        positionX: localPlayerData.sprite.x,
                        positionY: localPlayerData.sprite.y,
                        flip: flip,
                        roomId: roomId,
                        sessionId: sessionId
                    }), {});
                }
            } else {
                console.warn('Local player data or sprite is undefined during move');
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

        function createPlayerSprite(scene, sessionId, username, role) {
            console.log('Creating player sprite with username:', username, 'and role:', role);
            let newPlayerSprite = scene.add.sprite(PLAYER_START_X, PLAYER_START_Y, 'player');
            newPlayerSprite.displayHeight = PLAYER_HEIGHT;
            newPlayerSprite.displayWidth = PLAYER_WIDTH;
            newPlayerSprite.moving = false;

            // Determine text color based on role
            let textColor = '#ffffff'; // Default to white
            if (role === 'IMPOSTER') {
                textColor = role === 'IMPOSTER' ? '#ff0000' : '#ffffff'; // Imposter sees other imposters in red
            } else if (role === 'CREWMATE') {
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
    }, [jwtToken, playerId, roles, roomId, sessionId, username, navigate]);

    // Example function to handle elimination button click
    const handleEliminationClick = () => {
        const action = 'eliminate'; // Define the action type
        const targetPlayer = {id: 'targetPlayerId'}; // Define the target player
        updateElimination(players.current, action, targetPlayer).then(r => console.log('Player eliminated'));
    };

    // Function to handle elimination
    async function updateElimination(player, action, targetPlayer) {
        try {
            const response = await axios.post('http://localhost:8084/api/player/action', {
                player: player,
                action: action,
                targetPlayer: targetPlayer
            });
            console.log('Action performed successfully:', response.data);
        } catch (error) {
            console.error('Error performing action:', error);
        }
    }

    return (
        <div id="game-container" style={{ position: 'relative' }}>
            <img
                id="elimination-button"
                src={isKillBtnEnabled ? killBtnEnabledImg : killBtnDisabledImg}
                alt="Eliminate"
                onClick={isKillBtnEnabled ? handleEliminationClick : undefined}
                style={{ display: isKillBtnEnabled ? 'block' : 'none', width: '50px', height: '50px' }}
            />
            <canvas />
        </div>
    );
}

export default Game;
