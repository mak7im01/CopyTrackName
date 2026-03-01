// Скрипт для копирования названия трека в формате "Исполнитель - Название"

(function() {
    'use strict';

    // Глобальные настройки
    let currentSettings = null;

    // Получение настроек
    async function getSettings(name) {
        try {
            const response = await fetch(`http://localhost:2007/get_handle?name=${name}`);
            if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
      
            const { data } = await response.json();
            if (!data?.sections) {
                console.warn("Структура данных не соответствует ожидаемой");
                return null;
            }

            return transformJSON(data);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // "Трансформирование" полученных настроек для более удобного использования
    function transformJSON(data) {
        const result = {};

        try {
            data.sections.forEach(section => {
                section.items.forEach(item => {
                    if (item.type === "text" && item.buttons) {
                        result[item.id] = {};
                        item.buttons.forEach(button => {
                            result[item.id][button.id] = {
                                value: button.text,
                                default: button.defaultParameter
                            };
                        });
                    } else {
                        result[item.id] = {
                            value: item.bool || item.input || item.selected || item.value || item.filePath,
                            default: item.defaultParameter
                        };
                    }
                });
            });
        } finally {
            return result;
        }
    }

    // Функция для получения цвета текста из элемента
    function getTextColor() {
        // Приоритет: имя пользователя
        const userNameElement = document.querySelector('.UserProfile_userName__PTRuJ');
        if (userNameElement) {
            const computedStyle = window.getComputedStyle(userNameElement);
            return computedStyle.color;
        }
        
        // Запасной вариант - заголовок страницы
        const titleElement = document.querySelector('.PageHeaderTitle_title__caKyB');
        if (titleElement) {
            const computedStyle = window.getComputedStyle(titleElement);
            return computedStyle.color;
        }
        
        // Альтернативный вариант - любой текстовый элемент
        const textElement = document.querySelector('._MWOVuZRvUQdXKTMcOPx');
        if (textElement) {
            const computedStyle = window.getComputedStyle(textElement);
            return computedStyle.color;
        }
        
        // Если не нашли, возвращаем белый по умолчанию
        return 'rgb(255, 255, 255)';
    }

    // Функция для создания иконки копирования
    function createCopyIcon(settings) {
        const iconSize = settings?.iconSize?.value || 16;
        const iconOpacity = (settings?.iconOpacity?.value || 70) / 100;
        
        // Определяем цвет иконки
        let iconColor;
        const useStaticColor = settings?.iconColor?.value === true; // Статический цвет
        
        if (useStaticColor) {
            // Используем статический цвет из настроек
            iconColor = settings?.customColor?.value || '#ffffff';
        } else {
            // Используем динамический цвет из элемента страницы
            iconColor = getTextColor();
        }
        
        const icon = document.createElement('button');
        icon.innerHTML = `
            <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
            </svg>
        `;
        icon.style.cssText = `
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 4px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            opacity: ${iconOpacity};
            transition: opacity 0.2s, color 0.2s;
            margin-left: 8px;
            vertical-align: middle;
            color: ${iconColor};
        `;
        icon.title = 'Копировать название трека';
        
        // Сохраняем настройки для возможности обновления
        icon.dataset.useStaticColor = useStaticColor;
        icon.dataset.staticColor = settings?.customColor?.value || '#ffffff';
        icon.dataset.baseOpacity = iconOpacity;
        
        icon.addEventListener('mouseenter', () => {
            icon.style.opacity = '1';
        });
        
        icon.addEventListener('mouseleave', () => {
            icon.style.opacity = iconOpacity.toString();
        });
        
        return icon;
    }

    // Функция для копирования текста в буфер обмена
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Ошибка копирования:', err);
            return false;
        }
    }

    // Функция для показа уведомления
    function showNotification(message, success = true, settings) {
        // Проверяем, включены ли уведомления
        if (settings && settings.showNotification && !settings.showNotification.value) {
            return;
        }
        
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${success ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Функция для извлечения информации о треке
    function extractTrackInfo(metaContainer, settings) {
        const titleElement = metaContainer.querySelector('[data-test-id="TRACK_TITLE"] .Meta_title__GGBnH');
        const artistElement = metaContainer.querySelector('[data-test-id="SEPARATED_ARTIST_TITLE"] .Meta_artistCaption__JESZi');
        
        if (!titleElement || !artistElement) {
            return null;
        }
        
        const title = titleElement.textContent.trim();
        const artist = artistElement.textContent.trim();
        
        // Проверяем, включен ли пользовательский формат
        if (settings?.enableCustomFormat?.value === true && settings?.customFormat?.customFormatText) {
            const customFormat = settings.customFormat.customFormatText.value;
            return customFormat
                .replace('{artist}', artist)
                .replace('{title}', title);
        }
        
        // Используем стандартные форматы
        const formatId = settings?.copyFormat?.value || 1;
        
        switch (formatId) {
            case 1: // Исполнитель - Название
                return `${artist} - ${title}`;
            case 2: // Название - Исполнитель
                return `${title} - ${artist}`;
            case 3: // Только исполнитель
                return artist;
            case 4: // Только название
                return title;
            default:
                return `${artist} - ${title}`;
        }
    }

    // Функция для добавления иконки копирования к контейнеру метаданных
    function addCopyIconToMeta(metaContainer, settings, forceUpdate = false) {
        const titleContainer = metaContainer.querySelector('.Meta_titleContainer__gDuXr');
        if (!titleContainer) {
            return;
        }
        
        const existingIcon = metaContainer.querySelector('.copy-track-icon');
        
        // Проверяем, включена ли иконка копирования
        if (settings && settings.enableCopyIcon && !settings.enableCopyIcon.value) {
            // Если иконка отключена, удаляем существующую
            if (existingIcon) {
                existingIcon.remove();
            }
            return;
        }
        
        // Если существует иконка и нужно обновить настройки
        if (existingIcon && forceUpdate) {
            existingIcon.remove();
        } else if (existingIcon && !forceUpdate) {
            // Иконка уже есть и обновление не требуется
            return;
        }
        
        const copyIcon = createCopyIcon(settings);
        copyIcon.classList.add('copy-track-icon');
        
        copyIcon.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const trackInfo = extractTrackInfo(metaContainer, currentSettings);
            if (trackInfo) {
                const success = await copyToClipboard(trackInfo);
                if (success) {
                    showNotification('Скопировано: ' + trackInfo, true, currentSettings);
                } else {
                    showNotification('Ошибка копирования', false, currentSettings);
                }
            } else {
                showNotification('Не удалось получить информацию о треке', false, currentSettings);
            }
        });
        
        titleContainer.appendChild(copyIcon);
    }

    // Функция для обновления цвета существующих иконок
    function updateIconColors(settings) {
        const icons = document.querySelectorAll('.copy-track-icon');
        const useStaticColor = settings?.iconColor?.value === true;
        
        icons.forEach(icon => {
            let newColor;
            if (useStaticColor) {
                newColor = settings?.customColor?.value || '#ffffff';
            } else {
                // Динамический цвет - всегда получаем актуальный цвет из DOM
                newColor = getTextColor();
            }
            icon.style.color = newColor;
        });
    }

    // Функция для периодического обновления динамического цвета
    function updateDynamicColors() {
        if (currentSettings && currentSettings.iconColor?.value !== true) {
            // Если включен динамический цвет, обновляем цвет иконок
            updateIconColors(currentSettings);
        }
    }

    // Функция для обновления размера существующих иконок
    function updateIconSizes(settings) {
        const icons = document.querySelectorAll('.copy-track-icon');
        const iconSize = settings?.iconSize?.value || 16;
        
        icons.forEach(icon => {
            const svg = icon.querySelector('svg');
            if (svg) {
                svg.setAttribute('width', iconSize);
                svg.setAttribute('height', iconSize);
            }
        });
    }

    // Функция для обновления прозрачности существующих иконок
    function updateIconOpacity(settings) {
        const icons = document.querySelectorAll('.copy-track-icon');
        const iconOpacity = (settings?.iconOpacity?.value || 70) / 100;
        
        icons.forEach(icon => {
            icon.style.opacity = iconOpacity.toString();
            icon.dataset.baseOpacity = iconOpacity;
            
            // Обновляем обработчики событий
            const newIcon = icon.cloneNode(true);
            newIcon.addEventListener('mouseenter', () => {
                newIcon.style.opacity = '1';
            });
            newIcon.addEventListener('mouseleave', () => {
                newIcon.style.opacity = iconOpacity.toString();
            });
            
            // Восстанавливаем обработчик клика
            newIcon.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const metaContainer = newIcon.closest('.Meta_root__R8n1h');
                if (metaContainer) {
                    const trackInfo = extractTrackInfo(metaContainer, currentSettings);
                    if (trackInfo) {
                        const success = await copyToClipboard(trackInfo);
                        if (success) {
                            showNotification('Скопировано: ' + trackInfo, true, currentSettings);
                        } else {
                            showNotification('Ошибка копирования', false, currentSettings);
                        }
                    } else {
                        showNotification('Не удалось получить информацию о треке', false, currentSettings);
                    }
                }
            });
            
            icon.replaceWith(newIcon);
        });
    }

    // Функция для обработки всех контейнеров метаданных на странице
    function processMetaContainers(settings, forceUpdate = false) {
        const metaContainers = document.querySelectorAll('.Meta_root__R8n1h');
        metaContainers.forEach(container => {
            addCopyIconToMeta(container, settings, forceUpdate);
        });
    }

    // Наблюдатель за изменениями DOM
    const observer = new MutationObserver((mutations) => {
        processMetaContainers(currentSettings);
    });

    // Запускаем наблюдатель
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Функция для обновления настроек и применения изменений
    async function updateSettings() {
        const settings = await getSettings("CopyTrackName");
        if (settings) {
            // Проверяем, какие именно настройки изменились
            if (currentSettings) {
                const colorChanged = 
                    settings.iconColor?.value !== currentSettings.iconColor?.value ||
                    settings.customColor?.value !== currentSettings.customColor?.value;
                
                const sizeChanged = settings.iconSize?.value !== currentSettings.iconSize?.value;
                const opacityChanged = settings.iconOpacity?.value !== currentSettings.iconOpacity?.value;
                const enableChanged = settings.enableCopyIcon?.value !== currentSettings.enableCopyIcon?.value;
                
                // Обновляем текущие настройки
                currentSettings = settings;
                
                // Применяем изменения без полного пересоздания, если возможно
                if (colorChanged) {
                    updateIconColors(settings);
                }
                if (sizeChanged) {
                    updateIconSizes(settings);
                }
                if (opacityChanged) {
                    updateIconOpacity(settings);
                }
                if (enableChanged) {
                    // Если изменилось состояние включения, пересоздаем все иконки
                    processMetaContainers(settings, true);
                }
            } else {
                // Первая загрузка настроек
                currentSettings = settings;
                processMetaContainers(settings, false);
            }
        }
    }

    // Первоначальная загрузка настроек
    updateSettings();

    // Обновляем настройки каждые 2 секунды
    setInterval(updateSettings, 2000);

    // Обновляем динамический цвет каждую секунду
    setInterval(updateDynamicColors, 1000);

    console.log('CopyTrackName скрипт загружен');
})();
