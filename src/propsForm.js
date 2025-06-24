/**
 * Converts a CSS style string to an object.
 * @param {string} [styleStr=''] - The CSS style string (e.g. 'color:red;font-size:12px').
 * @returns {Object} The style object representation.
 */
function styleStringToObj(styleStr = '') {
    const st = {};
    styleStr.split(';').forEach(rule => {
        let [k, ...v] = rule.split(':');
        if (!k || v.length === 0) return;
        st[k.trim()] = v.join(':').trim();
    });
    return st;
}

/**
 * Converts a style object to a CSS style string.
 * @param {Object} st - The style object.
 * @returns {string} The CSS style string.
 */
function styleObjToString(st) {
    return Object.entries(st)
        .filter(([k, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}:${v}`).join(';');
}

/**
 * Updates the properties form with selected element's properties.
 * Handles rendering fields, keeping focus, getting current values from element
 * and binding input/update events.
 */
function updatePropsForm() {
    let active = document.activeElement, fieldInfo = null;
    if (active && active.tagName === 'INPUT') {
        fieldInfo = {
            name: active.name,
            selectionStart: active.selectionStart,
            selectionEnd: active.selectionEnd
        };
    }
    let form = document.getElementById('properties-form');
    let obj = selectedElemId ? findElem(layout, selectedElemId) : null;
    const isLocked = obj && lockedElems.has(selectedElemId);

    let breadcrumb = obj ? 'Properties: ' + getBreadcrumbPath(selectedElemId) : 'Properties';
    let title = '<div id="propTitle">' +
        breadcrumb +
        '</div>';

    let fields = '';
    if (!selectedElemId || !obj) {
        form.innerHTML = title;
        return;
    }

    const disabledAttr = isLocked ? 'disabled' : '';
    if (obj.type === 'text' || obj.type === 'button' || obj.type === 'link') {
        fields += `<label>Text: <input type="text" name="text" value="${escapeHTML(obj.props.text || '')}" ${disabledAttr}></label>`;
    }
    if (obj.type === 'img') {
        fields += `<label>Src: <input type="text" name="src" value="${escapeHTML(obj.props.src || '')}" ${disabledAttr}></label>`;
    }
    if (obj.type === 'link') {
        fields += `<label>Href: <input type="text" name="href" value="${escapeHTML(obj.props.href || '')}" ${disabledAttr}></label>`;
    }
    if (obj.id !== 'root') {
        fields += `<div style="margin:7px 0 7px 0;font-size:13px;">
            <b>Classes:</b>
            <span id="classesCheckboxes"></span>
            </div>`;
    }

    let st = styleStringToObj(obj.props.style);

    if (obj.type === 'container' || obj.id === 'root') {
        fields += `
        <div>
            <label>Display:
                <select name="displayStyle" ${disabledAttr}>
                    <option value="block"${st['display'] === 'block' || !st['display'] ? ' selected' : ''}>Block</option>
                    <option value="flex"${st['display'] === 'flex' ? ' selected' : ''}>Flex</option>
                </select>
            </label>
        </div>
        <div>
            <label>Flex Direction:
                <select name="flexDirection" ${disabledAttr} ${st['display'] === 'flex' ? '' : 'disabled'}>
                    <option value="row"${st['flex-direction'] === 'row' ? ' selected' : ''}>Row</option>
                    <option value="column"${st['flex-direction'] === 'column' ? ' selected' : ''}>Column</option>
                </select>
            </label>
        </div>
    `;
    }

    fields += renderStyleFields(st, disabledAttr);

    form.innerHTML = title + fields;

    if (obj.id !== 'root') {
        const checkboxes = [];
        const allClasses = Object.keys(classStyles);
        const elementClasses = (obj.props.class || '').split(/\s+/).filter(Boolean);
        for (const cname of allClasses) {
            const checked = elementClasses.includes(cname) ? 'checked' : '';
            checkboxes.push(
                `<label class="cls-checkbox-label">
                  <input type="checkbox" name="clsbox" value="${escapeHTML(cname)}" ${checked} ${isLocked ? 'disabled' : ''}>${escapeHTML(displayClassName(cname))}
                </label>`
            );
        }
        form.querySelector("#classesCheckboxes").innerHTML = checkboxes.join('');
    }
    if (!isLocked) {
        form.oninput = function (e) {
            let get = n => form.querySelector(`[name="${n}"]`);
            let styleObj = styleStringToObj(obj.props.style);

            fetchStyleFromFields(form, styleObj);

            if (get('displayStyle')) styleObj['display'] = get('displayStyle').value;
            if (get('flexDirection')) styleObj['flex-direction'] = get('flexDirection').value;

            obj.props.style = styleObjToString(styleObj);

            if (get('text')) obj.props.text = get('text').value;
            if (get('href')) obj.props.href = get('href').value;
            if (get('src')) obj.props.src = get('src').value;
            if (get('class')) obj.props.class = get('class').value.trim();

            if (e.target.name === "clsbox") {
                let checked = Array.from(form.querySelectorAll('[name="clsbox"]:checked')).map(x => x.value);
                obj.props.class = checked.join(' ');
                pushHistory();
                render();
                updatePropsForm();
                return;
            }
            pushHistory();
            render();
            updatePropsForm();
        }
    } else {
        form.oninput = null;
    }

    if (fieldInfo) {
        let toFocus = form.querySelector(`[name="${fieldInfo.name}"]`);
        if (toFocus) {
            toFocus.focus();
            if (toFocus.setSelectionRange && fieldInfo.selectionStart != null) {
                setTimeout(() => {
                    if (toFocus.type === "number") {
                        let len = (toFocus.value || '').length;
                        toFocus.setSelectionRange(len, len);
                    } else if (toFocus.setSelectionRange && fieldInfo.selectionStart != null) {
                        toFocus.setSelectionRange(fieldInfo.selectionStart, fieldInfo.selectionEnd);
                    }
                }, 0);
            }
        }
    }
}

/**
 * Returns a readable breadcrumb path for a given element ID in the layout tree.
 * @param {string} elementId - The ID of the element.
 * @returns {string} Breadcrumb path.
 */
function getBreadcrumbPath(elementId) {
    let path = [];
    let currentId = elementId;
    while (currentId) {
        let obj = findElem(layout, currentId);
        if (!obj) break;
        let label = (obj.id === 'root') ? 'Root' : (obj.type.charAt(0).toUpperCase() + obj.type.slice(1));
        path.unshift(label);
        currentId = findParent(layout, currentId)?.id;
    }
    return path.join(' > ');
}

/**
 * Renders HTML for a set of editable style fields.
 * @param {Object} st - Style object for the element.
 * @param {string} [disabledAttr=''] - Extra attribute to disable fields, if needed.
 * @param {string} [prefix=''] - Optional prefix for name attributes.
 * @returns {string} HTML content string for the style fields panel.
 */
function renderStyleFields(st, disabledAttr = '', prefix = '') {
    const checkbox = (label, name, val) =>
        `<label style="margin-right:10px;"><input type="checkbox" name="${prefix}${name}" ${val ? 'checked' : ''} ${disabledAttr}> ${label}</label>`;
    const field = (label, name, value, unit = '', width = 50, type = 'number') =>
        `<label style="margin-right:16px;">${label}: <input type="${type}" name="${prefix}${name}" value="${value || ''}" style="width:${width}px" ${disabledAttr}>${unit}</label>`;
    const borderSelectOpts = ["", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"]
        .map(s => `<option value="${s}"${(st['border-style'] === s) ? ' selected' : ''}>${s || 'none'}</option>`).join('');
    const colorOrDefault = (c, def) => c && c.startsWith('#') ? c : def;

    return `
    <div class="style-fields-grid">
      <div class="style-row">
        ${checkbox("Bold", "bold", st['font-weight'] === 'bold')}
        ${checkbox("Italic", "italic", st['font-style'] === 'italic')}
        ${checkbox("Underline", "underline", st['text-decoration'] === 'underline')}
        <label style="margin-left:15px;">Text color: <input type="color" name="${prefix}color" value="${colorOrDefault(st['color'], '#000000')}" ${disabledAttr}></label>
        <label style="margin-left:15px;">BG: <input type="color" name="${prefix}bgColor" value="${colorOrDefault(st['background-color'], '#ffffff')}" ${disabledAttr}></label>
      </div>
      <div>
        ${field("Font size", "fontSize", st['font-size'] ? parseInt(st['font-size']) : '', 'px')}
      </div>
      <div>
        ${field("Width", "width", st['width'] ? parseInt(st['width']) : '', 'px')}
        ${field("Height", "height", st['height'] ? parseInt(st['height']) : '', 'px')}
      </div>
      <div class="style-row">
        ${field("Margin", "margin", st['margin'] ? parseInt(st['margin']) : '', 'px')}
        ${field("Padding", "padding", st['padding'] ? parseInt(st['padding']) : '', 'px')}
      </div>
      <div class="style-row">
        <b>Border:</b>
        ${field("", "borderWidth", st['border-width'] ? parseInt(st['border-width']) : '', 'px', 44)}
        <select name="${prefix}borderStyle" ${disabledAttr} style="margin:0 4px;">${borderSelectOpts}</select>
        <input type="color" name="${prefix}borderColor" value="${colorOrDefault(st['border-color'], '#000000')}" ${disabledAttr}>
      </div>
    </div>
    `;
}

/**
 * Fetches editable style field values from the properties form and updates the
 * given style object in-place. Used to propagate form field values back to style object representation.
 * @param {HTMLFormElement} form - The properties form DOM element.
 * @param {Object} styleObj - The style object to update.
 * @param {string} [prefix=''] - Name prefix for input fields.
 * @returns {Object} The updated style object.
 */
function fetchStyleFromFields(form, styleObj, prefix = '') {
    let get = n => form.querySelector(`[name="${prefix}${n}"]`);
    styleObj['font-weight'] = get('bold')?.checked ? 'bold' : '';
    styleObj['font-style'] = get('italic')?.checked ? 'italic' : '';
    styleObj['text-decoration'] = get('underline')?.checked ? 'underline' : '';
    styleObj['font-size'] = get('fontSize')?.value ? (get('fontSize').value + 'px') : '';
    styleObj['color'] = get('color')?.value || '';
    styleObj['background-color'] = get('bgColor')?.value || '';
    styleObj['width'] = get('width')?.value ? (get('width').value + 'px') : '';
    styleObj['height'] = get('height')?.value ? (get('height').value + 'px') : '';
    styleObj['margin'] = get('margin')?.value ? (get('margin').value + 'px') : '';
    styleObj['padding'] = get('padding')?.value ? (get('padding').value + 'px') : '';
    styleObj['border-width'] = get('borderWidth')?.value ? (get('borderWidth').value + 'px') : '';
    styleObj['border-style'] = get('borderStyle')?.value || '';
    styleObj['border-color'] = get('borderColor')?.value || '';
    return styleObj;
}