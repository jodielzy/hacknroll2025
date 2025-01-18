from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Shortcut descriptions and corresponding keybinds
shortcuts = [
    {"description": "Copy the selected text", "keybind": "Ctrl+C"},
    {"description": "Paste the copied text", "keybind": "Ctrl+V"},
    {"description": "Cut the selected text", "keybind": "Ctrl+X"},
    {"description": "Undo the last action", "keybind": "Ctrl+Z"},
    {"description": "Save the current file", "keybind": "Ctrl+S"},
    {"description": "Print the document", "keybind": "Ctrl+P"},
    {"description": "Select all text", "keybind": "Ctrl+A"},
    {"description": "Open a file", "keybind": "Ctrl+O"},
    {"description": "Find text in the document", "keybind": "Ctrl+F"},
]

games = {}  # Store game states by room
players_in_room = {}  # Track the number of players in each room

@socketio.on('join')
def handle_join(data):
    room = data['room']
    username = data['username']
    join_room(room)

    print(f"Join event received: room={room}, username={username}")  # Debug log

    # Initialize game state and player count for the room
    if room not in games:
        games[room] = {
            'shortcuts': shortcuts,  # Use the entire list of shortcuts
            'progress': {},         # Track progress of each player
            'sids': {},             # Track session IDs for players
            'winner': None          # Track if there's a winner
        }
        players_in_room[room] = 0


    # Save the player's session ID
    games[room]['sids'][username] = request.sid
    games[room]['progress'][username] = 0
    players_in_room[room] += 1

    print(f"{username} joined room {room}. Players: {players_in_room[room]}")

    if players_in_room[room] == 2:
        emit('start_countdown', {'message': 'Game starting soon!'}, room=room)
        emit('game_state', {'shortcuts': shortcuts}, room=room)


@socketio.on('input')
def handle_input(data):
    room = data['room']
    username = data['username']
    keybind_input = data['keybind']

    # Validate room and username
    if room not in games or username not in games[room]['progress']:
        print(f"Invalid room or username: {room}, {username}")
        return

    # Get current progress for the player
    current_index = games[room]['progress'][username]

    # Validate the keybind input
    if current_index < len(games[room]['shortcuts']) and keybind_input == games[room]['shortcuts'][current_index]['keybind']:
        # Update the player's progress
        games[room]['progress'][username] += 1
        print(f"Progress updated for {username}: {games[room]['progress'][username]}")

         # Check if the player has completed all shortcuts
        if games[room]['progress'][username] == len(games[room]['shortcuts']):
            games[room]['winner'] = username
            print(f"Winner: {username}")

            # Notify the winner
            emit('game_result', {'result': 'victory'}, to=games[room]['sids'][username])

            # Notify other players of their loss
            for player, sid in games[room]['sids'].items():
                if player != username:
                    emit('game_result', {'result': 'loss'}, to=sid)
            return

        # Notify the player who made progress
        emit('player_progress', {
            'username': username,
            'progress': games[room]['progress'][username]
        }, to=games[room]['sids'][username])

    # Broadcast the game state to all players
    emit('game_state', {
        'shortcuts': games[room]['shortcuts'],
        'progress': games[room]['progress']
    }, room=room)

@socketio.on('leave')
def handle_leave(data):
    room = data['room']
    username = data['username']
    leave_room(room)

    if room in players_in_room:
        players_in_room[room] -= 1
        if players_in_room[room] <= 0:
            del players_in_room[room]
            del games[room]

        print(f"{username} left room {room}. Players: {players_in_room.get(room, 0)}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Use PORT from environment or default to 5000
    socketio.run(app, host='0.0.0.0', port=port)
