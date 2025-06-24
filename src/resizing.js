/**
 * Adds resize handles (E/S/SE) to an element for interactive resizing with the mouse.
 * @param {HTMLElement} elem - The DOM element to add handles to.
 * @param {object} obj - The related layout object for the element.
 */
function addResizeHandles(elem, obj) {
    const directions = [
        { dir: 'e', cursor: 'ew-resize' },
        { dir: 's', cursor: 'ns-resize' },
        { dir: 'se', cursor: 'nwse-resize' }
    ];
    directions.forEach(({ dir, cursor }) => {
        const handle = document.createElement('div');
        handle.className = 'resize-handle resize-' + dir;
        handle.style.position = 'absolute';
        handle.style.zIndex = 20;
        handle.style.background = '#67c8ff';
        handle.style.opacity = 0.7;
        handle.style.borderRadius = '2px';

        if (dir === 'e') {
            handle.style.right = '-6px'; handle.style.top = '40%';
            handle.style.width = '10px'; handle.style.height = '28px'; handle.style.cursor = cursor;
        }
        if (dir === 's') {
            handle.style.bottom = '-6px'; handle.style.left = '40%';
            handle.style.width = '28px'; handle.style.height = '10px'; handle.style.cursor = cursor;
        }
        if (dir === 'se') {
            handle.style.right = '-7px'; handle.style.bottom = '-7px';
            handle.style.width = '16px'; handle.style.height = '16px'; handle.style.cursor = cursor;
        }
        elem.appendChild(handle);

        handle.addEventListener('mousedown', function (e) {
            e.preventDefault(); e.stopPropagation();
            startResizing(obj, dir, e);
        });
    });
}

let resizingInfo = null;

function startResizing(obj, direction, mouseDownEvent) {
    const elem = document.querySelector(`[data-id="${obj.id}"]`);
    if (!elem) return;
    const rect = elem.getBoundingClientRect();

    let origStyle = styleStringToObj(obj.props.style);
    let startX = mouseDownEvent.clientX, startY = mouseDownEvent.clientY;
    let startW = rect.width, startH = rect.height;
    let origW = origStyle.width ? parseInt(origStyle.width) : startW;
    let origH = origStyle.height ? parseInt(origStyle.height) : startH;

    resizingInfo = { obj, direction, startX, startY, startW, startH, origStyle, origW, origH };

    document.body.style.userSelect = 'none';

    function onMove(e) {
        let dx = e.clientX - resizingInfo.startX, dy = e.clientY - resizingInfo.startY;
        let styleObj = styleStringToObj(resizingInfo.obj.props.style);

        if (direction === 'e' || direction === 'se') {
            let newW = Math.max(40, resizingInfo.origW + dx);
            styleObj.width = newW + 'px';
        }
        if (direction === 's' || direction === 'se') {
            let newH = Math.max(30, resizingInfo.origH + dy);
            styleObj.height = newH + 'px';
        }
        resizingInfo.obj.props.style = styleObjToString(styleObj);
        render();
        updatePropsForm();
    }
    function onUp() {
        pushHistory();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.userSelect = '';
        resizingInfo = null;
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}