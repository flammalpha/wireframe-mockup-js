/**
 * Handles drop events for draggable UI elements or components.
 * Supports both toolbox-to-layout and element-to-element drops, adjusting
 * stacking direction and sizes when needed. Horizontal (left/right) drops
 * configure flex row, vertical (top/bottom) configure flex column. Prevents dropping
 * into locked elements. Maintains history for undo/redo.
 *
 * @param {DragEvent} e - The drag event.
 * @param {Object} obj - The layout element object that is the drop target.
 * @property {string} obj.id - Unique identifier for the layout element.
 * @property {Array<Object>} obj.children - Array of child element objects.
 * @property {Object} obj.props - Props associated with the layout element.
 */
function handleDrop(e, obj) {
    e.preventDefault();
    e.stopPropagation();
    if (isElemLockedOrAncestorLocked(obj.id)) return;

    let rect = (e.target.closest('.wire-elem') || {}).getBoundingClientRect?.() || { left: 0, width: 1, top: 0, height: 1 };
    let relX = e.clientX - rect.left;
    let relY = e.clientY - rect.top;

    let isLeft = relX < rect.width / 4;
    let isRight = relX > 3 * rect.width / 4;
    let isTop = relY < rect.height / 4;
    let isBottom = relY > 3 * rect.height / 4;

    // Horizontal or vertical drop logic
    if (dragElemId && dragElemId !== obj.id && (isLeft || isRight || isTop || isBottom)) {
        let parentObj = findParent(layout, obj.id);
        if (!parentObj) return;

        let st = styleStringToObj(parentObj.props.style || '');

        // Horizontal stacking
        if (isLeft || isRight) {
            st['display'] = 'flex';
            st['flex-direction'] = 'row';
        }
        // Vertical stacking
        if (isTop || isBottom) {
            st['display'] = 'flex';
            st['flex-direction'] = 'column';
        }

        parentObj.props.style = styleObjToString(st);

        let movedElem = removeElem(layout, dragElemId);
        let idx = parentObj.children.findIndex(c => c.id === obj.id);
        if (isRight || isBottom) idx++;
        parentObj.children.splice(idx, 0, movedElem);

        // Set size: width for flex-row, height for flex-column
        if (st['flex-direction'] === 'row') {
            let width = (100 / parentObj.children.length).toFixed(2) + '%';
            parentObj.children.forEach(child => {
                let cst = styleStringToObj(child.props.style || '');
                cst.width = width;
                cst.height = '';
                child.props.style = styleObjToString(cst);
            });
        } else if (st['flex-direction'] === 'column') {
            let height = (100 / parentObj.children.length).toFixed(2) + '%';
            parentObj.children.forEach(child => {
                let cst = styleStringToObj(child.props.style || '');
                cst.height = height;
                cst.width = '';
                child.props.style = styleObjToString(cst);
            });
        }

        pushHistory();
        render();
        updatePropsForm();
        return;
    }

    let type = e.dataTransfer.getData("type");
    let isToolbox = !!type;
    if (isToolbox) {
        let el = newElem(type);

        let parentObj = findParent(layout, obj.id);
        if ((isLeft || isRight || isTop || isBottom) && parentObj) {
            let st = styleStringToObj(parentObj.props.style || '');
            if (isLeft || isRight) {
                st['display'] = 'flex';
                st['flex-direction'] = 'row';
            }
            if (isTop || isBottom) {
                st['display'] = 'flex';
                st['flex-direction'] = 'column';
            }
            parentObj.props.style = styleObjToString(st);

            let idx = parentObj.children.findIndex(c => c.id === obj.id);
            if (isRight || isBottom) idx++;
            parentObj.children.splice(idx, 0, el);

            if (st['flex-direction'] === 'row') {
                let width = (100 / parentObj.children.length).toFixed(2) + '%';
                parentObj.children.forEach(child => {
                    let cst = styleStringToObj(child.props.style || '');
                    cst.width = width;
                    cst.height = '';
                    child.props.style = styleObjToString(cst);
                });
            } else if (st['flex-direction'] === 'column') {
                let height = (100 / parentObj.children.length).toFixed(2) + '%';
                parentObj.children.forEach(child => {
                    let cst = styleStringToObj(child.props.style || '');
                    cst.height = height;
                    cst.width = '';
                    child.props.style = styleObjToString(cst);
                });
            }
            pushHistory();
            render();
            updatePropsForm();
        } else {
            pushHistory();
            obj.children.push(el);
            render();
            updatePropsForm();
        }
    }
    else if (dragElemId && dragElemId !== obj.id) {
        pushHistory();
        moveElem(dragElemId, obj.id);
        render();
        updatePropsForm();
    }
}