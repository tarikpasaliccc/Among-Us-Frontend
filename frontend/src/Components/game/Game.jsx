import Phaser from "phaser";
import ConfirmationModal from "../ConfirmationModel";
import React, { useEffect, useRef, useState } from "react";
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
} from "./constants";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const Game = () => {
    const jwtToken = sessionStorage.getItem('jwtToken');
    const sessionId = sessionStorage.getItem('sessionId');
    const playerId = sessionStorage.getItem('playerId');
    const roomId = sessionStorage.getItem('roomId');
    const players = useRef(new Map());
    const pressedKeys = useRef([]);
    const navigate = useNavigate();
    const location = useLocation();
    const username = location.state?.username;
    const roles = location.state?.players || []; // denk an
    console.log("Location roles %s", roles)
    const stompClientRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReadyToNavigate, setIsReadyToNavigate] = useState(false);

    useEffect(() => {
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
            const socket = new SockJS('http://localhost:8080/ws');
            stompClientRef.current = Stomp.over(socket);
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
        }

        function create() {
            const scene = this;
            this.ship = this.add.image(0, 0, 'ship');

            const localPlayerRole = roles.find(p => p.playerId.toString() === playerId)?.role;
            console.log("Role and PlayerId %s %s", roles, playerId)
            const localPlayer = createPlayerSprite(scene, sessionId, username, localPlayerRole);
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

            stompClientRef.current.connect({}, () => {
                stompClientRef.current.subscribe(`/topic/move/${roomId}`, (message) => {
                    const playerPosition = JSON.parse(message.body);
                    console.log("Roles log" +  roles )
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
                        const newPlayer = createPlayerSprite(scene, playerPosition.sessionId, playerPosition.username, playerRole);
                        players.current.set(playerPosition.sessionId, newPlayer);
                    }
                });

                stompClientRef.current.subscribe(`/topic/moveEnd/${roomId}`, (message) => {
                    const endMove = JSON.parse(message.body);
                    const playerData = players.current.get(endMove.sessionId);
                    if (playerData) {
                        playerData.sprite.moving = false;
                    }
                });

                stompClientRef.current.subscribe('/topic/leave', (message) => {
                    const disconnectedPlayer = JSON.parse(message.body);
                    removePlayerSprite(disconnectedPlayer.sessionId);
                });
            });
        }

        function update() {
            // Center the camera on the local player's sprite
            this.scene.scene.cameras.main.centerOn(players.current.get(sessionId).sprite.x, players.current.get(sessionId).sprite.y);

            // Update the position of the text objects relative to their respective sprites only if positions have changed
            players.current.forEach((playerData) => {
                if (playerData.sprite && playerData.text) {
                    const { x, y } = playerData.sprite;
                    if (playerData.text.x !== x || playerData.text.y !== y - 50) {
                        console.log(`Updating text position for player ${playerData.username} to (${x}, ${y - 50})`);
                        playerData.text.setPosition(x, y - 50);
                    }
                }
            });

            // Handle player movement and animations
            const playerMoved = movePlayer(pressedKeys.current, players.current.get(sessionId).sprite);
            if (playerMoved) {
                players.current.get(sessionId).movedLastFrame = true;
            } else {
                if (players.current.get(sessionId).movedLastFrame) {
                    if (stompClientRef.current && stompClientRef.current.connected) {
                        stompClientRef.current.send('/app/moveEnd', JSON.stringify({
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
            if (stompClientRef.current && stompClientRef.current.connected) {
                stompClientRef.current.send('/app/move', JSON.stringify({
                    direction: direction,
                    flip: flip,
                    token: jwtToken,
                    sessionId: sessionId,
                    roomId: roomId
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

        function createPlayerSprite(scene, sessionId, username, localPlayerRole) {
            console.log(`Creating player sprite for ${username} at (${PLAYER_START_X}, ${PLAYER_START_Y})`);
            let newPlayerSprite = scene.add.sprite(PLAYER_START_X, PLAYER_START_Y, 'player');
            newPlayerSprite.displayHeight = PLAYER_HEIGHT;
            newPlayerSprite.displayWidth = PLAYER_WIDTH;
            newPlayerSprite.moving = false;
            console.log("role %s", localPlayerRole);

            const textColor = localPlayerRole === 'IMPOSTER' ? '#ff0000' : '#127cd9';
            let newPlayerText = scene.add.text(PLAYER_START_X, PLAYER_START_Y - 50, username, {
                fontSize: '20px',
                color: textColor,
                align: 'center'
            }).setOrigin(0.5, 0.5).setDepth(1); // Set depth to ensure text is above other objects

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
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (stompClientRef.current && stompClientRef.current.connected) {
                stompClientRef.current.disconnect();
            }
            game.destroy(true);
        };
    }, [isModalOpen, isReadyToNavigate, jwtToken, playerId, roles, roomId, sessionId, username]);

    const handleConfirmNavigation = () => {
        sessionStorage.removeItem('jwtToken');
        sessionStorage.removeItem('sessionId');
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.send('/app/leave', JSON.stringify({
                token: jwtToken,
                sessionId: sessionId
            }), {});
        }
        setIsReadyToNavigate(true);
        navigate('/');
    };

    const handleCancelNavigation = () => {
        setIsModalOpen(false);
    };

    return (
        <div id="game-container">
            {isModalOpen && (
                <ConfirmationModal
                    isOpen={isModalOpen}
                    onConfirm={handleConfirmNavigation}
                    onCancel={handleCancelNavigation}
                    message="Are you sure you want to leave the game?"
                />
            )}
            <canvas />
        </div>
    );
};

export default Game;
