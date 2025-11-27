import Modal from "./Modal";

export default class Chat {
    constructor(container) {
        this.container = container;
        this.websocket = null;
        this.nickname = null;
        this.userId = null;
        this.serverUrl = 'http://localhost:3000';

        // Обработка закрытия страницы
        window.addEventListener('beforeunload', () => {
            this.exitChat();
        });
    }

    init() {
        this.showNicknameModal();
    }

    showNicknameModal() {
        const modal = new Modal('Выберите псевдоним', 'Введите ваш никнейм');

        modal.onSubmit = async (nickname) => {
            try {
                // Регистрируем пользователя на сервере
                const response = await fetch(`${this.serverUrl}/new-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nickname }),
                });

                const result = await response.json();

                if (result.status === 'error') {
                    const hint = modal.modal.querySelector('.form__hint');
                    hint.textContent = result.message || 'Ошибка регистрации';

                    const input = modal.modal.querySelector('.modal__input');
                    input.value = '';
                    input.focus();
                    return;
                }

                this.nickname = nickname;
                this.userId = result.user.id;
                modal.hide();

                this.bindToDOM();
                this.registerEvents();
                this.subscribeOnEvents();
            } catch (error) {
                console.error('Ошибка при регистрации:', error);
                const hint = modal.modal.querySelector('.form__hint');
                hint.textContent = 'Ошибка подключения. Попробуйте снова.';
            }
        };

        modal.render();
        modal.show();
    }

    bindToDOM() {
        const html = `
      <div class="container">
        <h1 class="chat__header">Чат</h1>
        <div class="chat__container">
          <div class="chat__area">
            <div class="chat__messages-container" id="messagesContainer"></div>
            <div class="chat__messages-input">
              <form class="form" id="messageForm">
                <div class="form__group">
                  <input 
                    type="text" 
                    class="form__input" 
                    id="messageInput"
                    placeholder="Введите сообщение..."
                  />
                </div>
              </form>
            </div>
          </div>
          <div class="chat__userlist" id="userList"></div>
        </div>
      </div>
    `;

        this.container.innerHTML = html;
    }

    registerEvents() {
        const form = document.getElementById('messageForm');
        const input = document.getElementById('messageInput');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage(input.value);
            input.value = '';
            input.focus();
        });
    }

    subscribeOnEvents() {
        // Подключение к WebSocket
        this.websocket = new WebSocket('ws://localhost:3000');

        this.websocket.addEventListener('open', () => {
            console.log('WebSocket подключен');
        });

        this.websocket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Ошибка при парсинге сообщения:', error);
            }
        });

        this.websocket.addEventListener('close', () => {
            console.log('WebSocket закрыт');
        });

        this.websocket.addEventListener('error', (error) => {
            console.error('WebSocket ошибка:', error);
        });
    }

    handleMessage(data) {
        // Если это массив - это список пользователей
        if (Array.isArray(data)) {
            this.renderUsers(data);
            return;
        }

        // Если это объект с type
        switch (data.type) {
            case 'send':
                this.renderMessage(data);
                break;
            default:
                break;
        }
    }

    sendMessage(text) {
        if (!text.trim() || !this.websocket) return;

        const message = {
            type: 'send',
            message: text,
            user: {
                id: this.userId,
                name: this.nickname,
            },
        };

        this.websocket.send(JSON.stringify(message));
    }

    renderMessage(data) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        const messageDiv = document.createElement('div');

        const isOwn = data.user.id === this.userId;
        const className = isOwn
            ? 'message__container message__container-yourself'
            : 'message__container message__container-interlocutor';

        messageDiv.className = className;
        messageDiv.innerHTML = `
      <div class="message__header">
        ${isOwn ? 'You' : data.user.name}, ${this.formatDate(new Date())}
      </div>
      <div class="message__text">${this.escapeHtml(data.message)}</div>
    `;

        container.append(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    renderUsers(users) {
        const userList = document.getElementById('userList');
        if (!userList) return;

        userList.innerHTML = '';

        users.forEach((user) => {
            const userDiv = document.createElement('div');
            userDiv.className = 'chat__user';

            const isYou = user.id === this.userId;
            const displayName = isYou ? 'You' : user.name;
            const style = isYou ? 'color: #20b1df;' : '';

            userDiv.innerHTML = `<span style="${style}">${displayName}</span>`;
            userList.append(userDiv);
        });
    }

    formatDate(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${hours}:${minutes} ${day}.${month}.${year}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    exitChat() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'exit',
                user: {
                    id: this.userId,
                    name: this.nickname,
                },
            }));
        }
    }
}