import Phaser from "phaser";
import React, { useEffect, useRef, useState } from "react";
import shipImg from "./assets/ship.png";
import playerSprite from "./assets/player.png";
import SockJS from 'sockjs-client';
import Stomp from 'webstomp-client';
import taskImg from "./assets/task.png";
import killBtnEnabledImg from "./assets/kill-btn-enabled.png";
import killBtnDisabledImg from "./assets/kill-btn-disabled.png";
import ghostSprite from "./assets/ghost.png";
import luigiSprite from "./assets/luigiSprite.png";
import deadPlayerSprite from "./assets/deadSprite.png";
import reportBtnEnabled from "./assets/report-btn-enabled.png";
import reportBtnDisabled from "./assets/report-btn-disabled.png";
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
    const playerRoleList = sessionStorage.getItem('rolesList');
    const players = useRef(new Map());
    const [roles, setRoles] = useState([]);
    const pressedKeys = useRef([]);
    const targetPlayerIdRef = useRef(null);
    const navigate = useNavigate();
    const movementStompClientRef = useRef(null);
    const {
        gameRoomStompClient,
        isGameRoomConnected,
        emergencyStompClient,
        isConnected
    } = useWebSocket();

    useEffect(() => {
        console.log("Game component mounted");

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

            this.load.spritesheet('luigiPlayer', luigiSprite, {
                frameWidth: 75.667,
                frameHeight: 118,
            });

            this.load.spritesheet('ghostPlayer', ghostSprite, {
                frameWidth: 92,
                frameHeight: 110,
            });

            this.load.image('task', taskImg);
            this.load.image('emergencyButton', taskImg);
            this.load.image('killBtnEnabled', killBtnEnabledImg);
            this.load.image('killBtnDisabled', killBtnDisabledImg);
            this.load.image('reportBtnEnabled', reportBtnEnabled);
            this.load.image('reportBtnDisabled', reportBtnDisabled);
            this.load.image('deadPlayer', deadPlayerSprite);

            this.load.on('complete', () => {
                console.log('All assets loaded');
            });
        }

        function create() {
            console.log("Phaser create function called");
            const scene = this;
            this.ship = this.add.image(0, 0, 'ship');

            let localPlayerRole;
            const playerRoles = JSON.parse(playerRoleList);
            console.log("Player Roles: ", playerRoles);

            for (let i = 0; i < playerRoles.length; i++) {
                if (playerId == playerRoles[i].playerId) {
                    localPlayerRole = playerRoles[i].role;
                    break;
                }
            }

            const updateKillButtonState = (isEnabled) => {
                if (scene.killBtn) {
                    if (isEnabled) {
                        this.killBtn.setTexture('killBtnEnabled');
                        this.killBtn.setInteractive();
                        this.killBtn.setScale(0.035);
                    } else {
                        this.killBtn.setTexture('killBtnDisabled');
                        this.killBtn.disableInteractive();
                        this.killBtn.setScale(0.05);
                    }
                }
            };

            if (localPlayerRole === 'IMPOSTER') {
                this.killBtn = this.add.image(1450, 680, 'killBtnDisabled');
                this.killBtn.setInteractive();
                this.killBtn.setScale(0.045);
                this.killBtn.setScrollFactor(0);

                // Initialize button state
                updateKillButtonState(false);

                this.killBtn.on('pointerdown', async () => {
                    if (this.killBtn.input.enabled) {
                        console.log('Kill button clicked');

                        if (targetPlayerIdRef.current) {
                            try {
                                const response = await axios.post('http://localhost:8081/api/gameRooms/eliminatePlayer', {
                                    gameRoomId: roomId,
                                    votedPlayerId: targetPlayerIdRef.current
                                });

                                if (response.data) {
                                    console.log('Player set to dead', response.data);
                                    console.log('Target player id:', targetPlayerIdRef.current);
                                    console.log('Players:', players.current);

                                    if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                                        movementStompClientRef.current.send('/app/eliminatePlayer', JSON.stringify({
                                            roomId: roomId,
                                            targetPlayerId: targetPlayerIdRef.current
                                        }));
                                    }

                                    const playerData = players.current.get(targetPlayerIdRef.current);
                                    console.log('Player data:', playerData);
                                    if (playerData && playerData.sprite) {
                                        console.log('Changing texture to deadPlayer for player:', targetPlayerIdRef.current);
                                        playerData.sprite.setTexture('deadPlayer');
                                        playerData.sprite.anims.stop();
                                        playerData.sprite.update();
                                        playerData.status = "DEAD";
                                        console.log('Player data after setting status to DEAD:', playerData);
                                    } else {
                                        console.warn('Player data or sprite not found for:', targetPlayerIdRef.current);
                                    }
                                } else {
                                    console.error('Failed to eliminate player:', response.data.message);
                                }
                            } catch (error) {
                                console.error('Error setting player to dead:', error);
                            }
                        } else {
                            console.warn('No target player selected for elimination');
                        }
                    }
                });
            }

            const updateReportButtonState = (isEnabled) => {
                if (scene.reportBtn) {
                    if (isEnabled) {
                        this.reportBtn.setTexture('reportBtnEnabled');
                        this.reportBtn.setInteractive();
                        this.reportBtn.setScale(0.17);
                    } else {
                        this.reportBtn.setTexture('reportBtnDisabled');
                        this.reportBtn.disableInteractive();
                        this.reportBtn.setScale(0.15);
                    }
                }
            }

            this.reportBtn = this.add.image(1450, 560, 'reportBtnDisabled');
            this.reportBtn.setInteractive();
            this.reportBtn.setScrollFactor(0);

            // Initialize button state
            updateReportButtonState(false);

            this.reportBtn.on('pointerdown', () => {
                if (this.reportBtn.input.enabled) {
                    console.log('Report button clicked');

                    if (isConnected) {
                        console.log('Emergency meeting initiated via report button');
                        emergencyStompClient.send(`/app/emergencyMeeting/${roomId}`, () => {});
                    }
                    try {
                        const response = axios.post(`http://localhost:8083/api/voting/initiateVoting/${roomId}`, () => {
                            console.log(response.data)
                        });
                    } catch (error) {
                        console.error('Error initiating voting:', error);
                    }
                }
            });

            const localPlayer = createPlayerSprite(scene, playerId, username, PLAYER_START_X, PLAYER_START_Y, true, localPlayerRole);
            players.current.set(playerId, localPlayer);

            TASK_POSITIONS.forEach((pos) => {
                const task = this.add.image(pos.x, pos.y, 'task');
                task.setScale(0.03);
                task.setInteractive();
                task.on('pointerdown', () => {
                    showTaskPopup(this, task);
                });
            });

            const emergencyButtonPos = EMERGENCY_TASK_POSITIONS[0];
            const emergencyButton = this.add.image(emergencyButtonPos.x, emergencyButtonPos.y, 'emergencyButton');
            emergencyButton.setScale(0.03);
            emergencyButton.setInteractive();
            emergencyButton.on('pointerdown', () => {
                if (isConnected) {
                    console.log('Emergency button clicked');
                    emergencyStompClient.send(`/app/emergencyMeeting/${roomId}`, () => {});
                }

                try {
                    const response = axios.post(`http://localhost:8083/api/voting/initiateVoting/${roomId}`, () => {
                        console.log(response.data)
                    });
                } catch (error) {
                    console.error('Error initiating voting:', error);
                }
            });

            this.anims.create({
                key: 'running',
                frames: this.anims.generateFrameNumbers('player'),
                frameRate: 16,
                repeat: -1
            });

            this.anims.create({
                key: 'floating',
                frames: this.anims.generateFrameNumbers('ghostPlayer'),
                frameRate: 16,
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
                console.log("Movement WebSocket connected");

                movementStompClientRef.current.subscribe(`/topic/move/${roomId}`, (message) => {
                    const playerPosition = JSON.parse(message.body);
                    console.log('Received player position from server:', playerPosition);
                    console.log('All players:', players.current);
                    console.log('This is the status of the other player:', playerPosition.status);

                    if (!playerPosition || !playerPosition.sessionId) {
                        console.log('Invalid player position received:', playerPosition);
                        return;
                    }

                    const playerIdString = playerPosition.playerId.toString();
                    const playerData = players.current.get(playerIdString);

                    if (localPlayerRole === 'IMPOSTER' && playerPosition.wouldCollide) {
                        updateKillButtonState.call(scene, true);
                        targetPlayerIdRef.current = playerPosition.targetPlayerId;
                        console.log('Would collide with player:', playerPosition.targetPlayerId);
                        console.log('Target player id:', targetPlayerIdRef.current);
                    } else {
                        updateKillButtonState.call(scene, false);
                        targetPlayerIdRef.current = null;
                    }

                    if (playerPosition.wouldCollide && playerPosition.status === 'DEAD') {
                        updateReportButtonState.call(scene, true);
                    } else {
                        updateReportButtonState.call(scene, false);
                    }

                    if (playerData && playerData.sprite) {
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
                        console.log('Player already exists:', playerIdString);
                    }
                });

                movementStompClientRef.current.subscribe(`/topic/eliminatePlayer/${roomId}`, (message) => {
                    const eliminationData = JSON.parse(message.body);
                    const eliminatedPlayerId = eliminationData.playerId;
                    console.log('Player eliminated via WebSocket:', eliminatedPlayerId);

                    const playerData = players.current.get(eliminatedPlayerId);
                    if (playerData && playerData.sprite) {
                        playerData.sprite.setTexture('deadPlayer');
                        playerData.sprite.anims.stop();
                        playerData.sprite.update();
                        playerData.status = "DEAD";
                        console.log('Player data after setting status to DEAD:', playerData);
                    } else {
                        console.warn('Player data or sprite not found for:', eliminatedPlayerId);
                    }
                });

                movementStompClientRef.current.subscribe(`/topic/moveEnd/${roomId}`, (message) => {
                    const endMove = JSON.parse(message.body);
                    const playerData = players.current.get(endMove.playerId);
                    if (playerData && playerData.sprite) {
                        playerData.sprite.moving = false;
                    }
                });

                movementStompClientRef.current.subscribe('/topic/leave', (message) => {
                    const disconnectedPlayer = JSON.parse(message.body);
                    removePlayerSprite(disconnectedPlayer.playerId);
                });
            });

            if (isGameRoomConnected) {
                console.log('Subscribing to game room:', roomId);
                console.log('Current player id:', playerId);
                console.log(typeof playerId);

                gameRoomStompClient.subscribe(`/topic/join/${roomId}`, (message) => {
                    const playerData = JSON.parse(message.body);
                    console.log('Player joined:', playerData);

                    playerData.currentPlayers.forEach(currentPlayer => {
                        if (currentPlayer.status === "ALIVE" && !players.current.has(currentPlayer.playerId)) {
                            console.log('Current player:', currentPlayer);
                            const newPlayer = createPlayerSprite(
                                scene,
                                currentPlayer.playerId,
                                currentPlayer.username,
                                currentPlayer.x,
                                currentPlayer.y,
                                currentPlayer.flip,
                                currentPlayer.role
                            );
                            players.current.set(currentPlayer.playerId, newPlayer);
                        } else {
                            console.log('Player already exists or is not alive:', currentPlayer.playerId, currentPlayer.status);
                        }
                    });
                });

                axios.get(`http://localhost:8081/api/gameRooms/getCurrentPlayers/${roomId}`)
                    .then(response => {
                        const currentPlayers = response.data;
                        console.log('Current players:', currentPlayers);
                        currentPlayers.forEach(currentPlayer => {
                            if (currentPlayer.status === "ALIVE" && !players.current.has(currentPlayer.playerId)) {
                                console.log('Current player:', currentPlayer);
                                const newPlayer = createPlayerSprite(
                                    scene,
                                    currentPlayer.playerId,
                                    currentPlayer.username,
                                    currentPlayer.x,
                                    currentPlayer.y,
                                    currentPlayer.flip,
                                    currentPlayer.role
                                );
                                players.current.set(currentPlayer.playerId, newPlayer);
                            } else {
                                console.log('Player already exists or is not alive:', currentPlayer.playerId, currentPlayer.status);
                            }
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching existing players:', error);
                    });
            }

            if (isConnected) {
                console.log("Subscribing to emergency topics");

                emergencyStompClient.subscribe(`/topic/emergencyMeeting/${roomId}`, () => {
                    console.log('Emergency is being called');
                    navigate('/emergencyMeeting');
                });

                emergencyStompClient.subscribe(`/topic/emergencyMeetingEnd/${roomId}`, (message) => {
                    console.log('Emergency meeting ended:', message.body);
                    handleEmergencyMeetingEnd().then(r => console.log('Emergency meeting ended'));
                });
            }
        }

        function update() {
            const localPlayerData = players.current.get(playerId);
            if (localPlayerData && localPlayerData.sprite) {
                this.scene.scene.cameras.main.centerOn(localPlayerData.sprite.x, localPlayerData.sprite.y);

                players.current.forEach((playerData) => {
                    if (playerData && playerData.sprite && playerData.text) {
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
                                username: username,
                                roomId: roomId,
                                playerId: playerId
                            }), {});
                        }
                        localPlayerData.movedLastFrame = false;
                    }
                }

                animateMovement(pressedKeys.current, localPlayerData.sprite);
                players.current.forEach((playerData) => {
                    if (playerData.sprite && playerData.sprite.moving && !playerData.sprite.anims.isPlaying) {
                        playerData.sprite.play('running');
                    } else if (playerData.sprite && !playerData.sprite.moving && playerData.sprite.anims.isPlaying) {
                        playerData.sprite.stop('running');
                    }
                });
            } else {
                console.warn('Local player data or sprite is undefined');
            }
        }

        function movePlayer(pressedKeys, sprite) {
            let playerMoved = false;
            const localPlayerData = players.current.get(playerId);

            if (localPlayerData && (localPlayerData.status === 'ALIVE' || localPlayerData.status === 'GHOST')) {
                if (pressedKeys.includes('ArrowUp')) {
                    sendMove('UP', sprite.flipX, localPlayerData.status);
                    playerMoved = true;
                } else if (pressedKeys.includes('ArrowDown')) {
                    sendMove('DOWN', sprite.flipX, localPlayerData.status);
                    playerMoved = true;
                } else if (pressedKeys.includes('ArrowLeft')) {
                    sprite.setFlipX(true);
                    sendMove('LEFT', true, localPlayerData.status);
                    playerMoved = true;
                } else if (pressedKeys.includes('ArrowRight')) {
                    sprite.setFlipX(false);
                    sendMove('RIGHT', false, localPlayerData.status);
                    playerMoved = true;
                }
            } else {
                console.warn('Player is dead and cannot move:', localPlayerData)
            }
            return playerMoved;
        }

        function sendMove(direction, flip, status) {
            const localPlayerData = players.current.get(playerId);
            if (localPlayerData && localPlayerData.sprite) {
                if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                    movementStompClientRef.current.send('/app/move', JSON.stringify({
                        playerId: playerId,
                        direction: direction,
                        positionX: localPlayerData.sprite.x,
                        positionY: localPlayerData.sprite.y,
                        flip: flip,
                        roomId: roomId,
                        sessionId: sessionId,
                        username: username,
                        status: status
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

        function createPlayerSprite(scene, playerId, username, x, y, flip, role) {
            console.log('Creating player sprite with username:', username, 'and role:', role);
            let newPlayerSprite = scene.add.sprite(x, y, 'player');
            newPlayerSprite.displayHeight = PLAYER_HEIGHT;
            newPlayerSprite.displayWidth = PLAYER_WIDTH;
            newPlayerSprite.moving = false;
            newPlayerSprite.x = x;
            newPlayerSprite.y = y;
            newPlayerSprite.flipX = flip;

            let textColor = '#ffffff';
            if (role === 'IMPOSTER') {
                textColor = role === 'IMPOSTER' ? '#ff0000' : '#ffffff';
            } else if (role === 'CREWMATE') {
                textColor = '#ffffff';
            }

            let newPlayerText = scene.add.text(PLAYER_START_X, PLAYER_START_Y - 50, username, {
                fontSize: '20px',
                color: textColor,
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 4,
                }
            }).setOrigin(0.5, 0.5).setDepth(1);

            newPlayerSprite.text = username;

            return {
                sprite: newPlayerSprite,
                text: newPlayerText,
                playerId: playerId,
                username: username,
                status: 'ALIVE'
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

        function removePlayerSprite(playerId) {
            let playerData = players.current.get(playerId);
            if (playerData) {
                playerData.sprite.destroy();
                playerData.text.destroy();
                players.current.delete(playerId);
            }
        }

        async function handleEmergencyMeetingEnd() {
            try {
                const response = await axios.get(`http://localhost:8083/api/gameRooms/getDeadPlayersByRoomId/${roomId}`);
                const deadPlayers = response.data;

                deadPlayers.forEach(playerId => {
                    const playerData = players.current.get(playerId);
                    if (playerData) {
                        playerData.status = 'GHOST';
                        setPlayerToGhostMode(playerData);
                    }
                });
            } catch (error) {
                console.error('Error fetching dead players:', error);
            }
        }

        function setPlayerToGhostMode(playerData) {
            if (playerData && playerData.sprite) {
                playerData.sprite.setTexture('ghostPlayer');
                playerData.sprite.anims.play('floating');
                playerData.sprite.setFlipX(false);
                playerData.sprite.setDepth(1);
                console.log('Player set to ghost mode:', playerData);
            } else {
                console.warn('Player data or sprite not found for:', playerData);
            }
        }

        return () => {
            if (movementStompClientRef.current && movementStompClientRef.current.connected) {
                movementStompClientRef.current.disconnect();
            }
            game.destroy(true);
        };
    }, [jwtToken, playerId, roles, roomId, sessionId, username, navigate, isConnected, playerRoleList, emergencyStompClient, isGameRoomConnected, gameRoomStompClient]);

    return (
        <div id="game-container">
            <canvas />
        </div>
    );
};

export default Game;
