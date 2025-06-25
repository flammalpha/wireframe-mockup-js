/**
 * Renders a single layout element and its children recursively.
 * @param {object} obj - The layout element to render.
 * @param {HTMLElement} parent - The parent DOM element.
 */
function renderElem(obj, parent) {
    let elem;
    if (obj.type === 'container' || obj.id === 'root') {
        elem = document.createElement('div');
        elem.className = 'wire-elem';
        elem.style.position = 'relative';
        elem.innerHTML = (obj.id === 'root') ? '<b style="font-size:20px;color:#bbb;">(Root Layout)</b>'
            : '<span style="color:#888;">Container</span>';

        if (obj.props && obj.props.style) {
            elem.setAttribute('style', getMergedStyle(obj) + ';position:relative;');
        }

        if (obj.id !== 'root') {
            elem.classList.add('resizable-container');
            addResizeHandles(elem, obj);
        }
        const st = styleStringToObj(obj.props?.style);
        if (st['display'] === 'flex') {
            elem.style.display = 'flex';
            elem.style.flexDirection = st['flex-direction'] || 'row';
            elem.style.alignItems = st['align-items'] || 'flex-start';
            elem.style.gap = st['gap'] || '7px';
        }
    } else if (obj.type === 'text') {
        elem = document.createElement('div');
        elem.className = 'wire-elem';
        elem.textContent = obj.props?.text || 'Text';
        if (obj.props && obj.props.style) elem.setAttribute('style', getMergedStyle(obj));
    } else if (obj.type === 'button') {
        elem = document.createElement('button');
        elem.className = 'wire-elem';
        elem.textContent = obj.props?.text || 'Button';
        if (obj.props && obj.props.style) elem.setAttribute('style', getMergedStyle(obj));
    } else if (obj.type === 'img') {
        elem = document.createElement('img');
        elem.className = 'wire-elem';
        elem.src = obj.props?.src || 'https://via.placeholder.com/80x40';
        elem.style.width = '80px'; elem.style.height = '40px';
        if (obj.props && obj.props.style) elem.setAttribute('style', getMergedStyle(obj));
    } else if (obj.type === 'link') {
        elem = document.createElement('a');
        elem.className = 'wire-elem';
        elem.innerHTML = `<span>${escapeHTML(obj.props?.text || 'Link')}</span>`;
        elem.href = obj.props?.href || '#';
        elem.style.textDecoration = 'underline';
        elem.target = '_blank';
        if (obj.props && obj.props.style) elem.setAttribute('style', getMergedStyle(obj));
    }

    elem.dataset.id = obj.id;
    if (obj.id === selectedElemId) elem.classList.add('selected');
    let locked = isElemLockedOrAncestorLocked(obj.id);
    if (locked) elem.style.opacity = '0.4';

    elem.setAttribute('draggable', locked ? 'false' : 'true');
    elem.ondragstart = (e) => {
        dragElemId = obj.id;
        e.stopPropagation();
    };

    elem.addEventListener('dragover', function (e) {
        e.preventDefault();
        const rect = elem.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        if (relX < rect.width / 4) {
            elem.classList.add('drag-over-left');
            elem.classList.remove('drag-over-right', 'drag-over', 'drag-over-top', 'drag-over-bottom');
        } else if (relX > 3 * rect.width / 4) {
            elem.classList.add('drag-over-right');
            elem.classList.remove('drag-over-left', 'drag-over', 'drag-over-top', 'drag-over-bottom');
        } else if (relY < rect.height / 4) {
            elem.classList.add('drag-over-top');
            elem.classList.remove('drag-over-bottom', 'drag-over', 'drag-over-left', 'drag-over-right');
        } else if (relY > 3 * rect.height / 4) {
            elem.classList.add('drag-over-bottom');
            elem.classList.remove('drag-over-top', 'drag-over', 'drag-over-left', 'drag-over-right');
        } else {
            elem.classList.add('drag-over');
            elem.classList.remove('drag-over-left', 'drag-over-right', 'drag-over-top', 'drag-over-bottom');
        }
    });

    elem.addEventListener('dragleave', function (e) {
        elem.classList.remove('drag-over', 'drag-over-left', 'drag-over-right', 'drag-over-top', 'drag-over-bottom');
    });

    elem.ondrop = e => {
        elem.classList.remove('drag-over', 'drag-over-left', 'drag-over-right', 'drag-over-top', 'drag-over-bottom');
        handleDrop(e, obj)
    };

    elem.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const topLocked = getTopmostLockedAncestor(obj.id);
        if (topLocked) {
            selectElem(topLocked);
        } else {
            selectElem(obj.id);
        }
    };
    elem.oncontextmenu = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const topLocked = getTopmostLockedAncestor(obj.id);
        if (topLocked)
            showCtxMenuLocked(e.pageX, e.pageY, topLocked);
        else
            showCtxMenuUnlocked(e.pageX, e.pageY, obj.id);
    }

    if ((obj.type === 'container' || obj.id === 'root') && obj.children) {
        for (let child of obj.children) {
            renderElem(child, elem);
        }
        elem.ondragover = e => e.preventDefault();
        elem.ondrop = (e) => handleDrop(e, obj);
    }
    parent.appendChild(elem);
}

/**
 * Renders the entire layout and updates the class editor UI.
 */
function render() {
    let area = document.getElementById('mockup-area');
    // Use Shadow DOM to isolate styles
    if (!area.shadowRoot) {
        area.attachShadow({mode: 'open'});
    }
    const shadow = area.shadowRoot;
    shadow.innerHTML = '';
    renderElem(layout, shadow);
    renderClassEditor();
}

function getMergedStyle(obj) {
    let cs = {};
    if (obj.props && obj.props.class) {
        let cList = obj.props.class.trim().split(/\s+/);
        for (let c of cList) {
            Object.assign(cs, styleStringToObj(classStyles[c] || ''));
        }
    }
    let inline = styleStringToObj(obj.props?.style);
    Object.assign(cs, inline);
    return styleObjToString(cs);
}