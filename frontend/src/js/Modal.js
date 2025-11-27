export default class Modal {
    constructor(title, inputPlaceholder = '') {
        this.title = title;
        this.inputPlaceholder = inputPlaceholder;
        this.modal = null;
        this.onSubmit = null;
    }

    render() {
        const modalForm = document.createElement('div');
        modalForm.classList.add('modal__form');
        modalForm.innerHTML = `
          <div class="modal__background"></div>
          <div class="modal__content">
            <div class="modal__header">${this.title}</div>
            <div class="modal__body">
              <div class="form__group">
                <input 
                  type="text" 
                  class="form__input modal__input" 
                  placeholder="${this.inputPlaceholder}"
                  autofocus
                />
                <div class="form__hint"></div>
              </div>
            </div>
            <div class="modal__footer">
              <button class="modal__close">Отмена</button>
              <button class="modal__ok">Продолжить</button>
            </div>
          </div>
        `;

        this.modal = modalForm;
        document.body.append(modalForm);
        this.registerEvents();
    }

    registerEvents() {
        const input = this.modal.querySelector('.modal__input');
        const closeBtn = this.modal.querySelector('.modal__close');
        const okBtn = this.modal.querySelector('.modal__ok');
        const hint = this.modal.querySelector('.form__hint');

        // обработчик отправки формы
        const handleSubmit = () => {
            const value = input.value.trim();

            if (!value) {
                hint.textContent = 'Это поле не может быть пустым';
                return;
            }

            hint.textContent = '';

            if (this.onSubmit) {
                this.onSubmit(value);
            }
        };

        okBtn.addEventListener('click', handleSubmit);

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });

        closeBtn.addEventListener('click', () => {
            this.hide();
        });

        input.focus();
    }

    show() {
        if (this.modal) {
            this.modal.classList.add('active');
        }
    }

    hide() {
        if (this.modal) {
            this.modal.classList.remove('active');
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.remove();
                }
                this.modal = null;
            }, 300);
        }
    }
}