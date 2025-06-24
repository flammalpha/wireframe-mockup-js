let classStyles = {};
let selectedClassName = null;

/**
 * Removes the 'user-' prefix from class names if present.
 * @param {string} cname - The raw class name.
 * @returns {string} The display-friendly class name.
 */
function displayClassName(cname) {
    return cname.startsWith('user-') ? cname.slice(5) : cname;
}

/**
 * Renders the class editor UI for editing CSS classes.
 */
function renderClassEditor() {
    const ul = document.getElementById('classList');
    if (!ul) return;
    const classNames = Object.keys(classStyles);
    ul.innerHTML = "";

    const topDiv = document.createElement('div');
    topDiv.innerHTML = `
        <div style="font-weight:bold; font-size:15px; margin-bottom:8px;">Global Classes</div>
        <input type="text" id="globalAddClassInput" style="width:100px;font-size:13px;margin-right:6px;" placeholder="New class">
        <button id="globalAddClassBtn" type="button" style="font-size:13px;">+</button>
        <span id="addClassError" style="color:#c00;font-size:13px;display:none;margin-left:10px;"></span>
        <hr style="margin:10px 0;">
    `;
    ul.appendChild(topDiv);

    classNames.forEach(cname => {
        const li = document.createElement('li');
        li.style.marginBottom = "10px";
        li.innerHTML = `<div class="classNameListItem">
          <button type="button" class="selectClassBtn" data-cls="${escapeHTML(cname)}" style="background:${selectedClassName === cname ? '#def' : '#eee'};margin-right:7px;">${escapeHTML(displayClassName(cname))}</button>
          <button type="button" class="delClassBtn" data-cls="${escapeHTML(cname)}">✖</button>
        </div>`;
        ul.appendChild(li);
    });

    setTimeout(() => {
        document.querySelectorAll(".selectClassBtn").forEach(btn => {
            btn.onclick = () => {
                selectedClassName = btn.dataset.cls;
                renderClassEditor();
                renderClassPropertiesForm();
            };
        });
        const btn = document.getElementById('globalAddClassBtn');
        const input = document.getElementById('globalAddClassInput');
        const error = document.getElementById('addClassError');
        if (btn && input) {
            btn.onclick = function () {
                let cname = (input.value || '').trim();
                if (!cname.match(/^[a-zA-Z_][\w\-]*$/)) {
                    error.textContent = 'Invalid class name!';
                    error.style.display = 'inline';
                    return;
                }
                if (!cname) return;
                let fullName = cname.startsWith('user-') ? cname : 'user-' + cname;
                if (classStyles[fullName]) {
                    error.textContent = 'Class exists!';
                    error.style.display = 'inline';
                    return;
                }
                classStyles[fullName] = '';
                input.value = '';
                error.style.display = 'none';
                pushHistory();
                render();
                renderClassEditor();
            };
            input.oninput = () => { error.style.display = 'none'; };
            input.onkeydown = function (e) {
                if (e.key === "Enter") btn.click();
            }
        }
    }, 10);

    document.getElementById("classList").onclick = function (e) {
        if (e.target.classList.contains("delClassBtn")) {
            const cname = e.target.dataset.cls;
            delete classStyles[cname];
            traverseElems(layout, (eobj) => {
                if (eobj.props && eobj.props.class) {
                    let arr = eobj.props.class.split(/\s+/).filter(x => x && x !== cname);
                    if (arr.length !== eobj.props.class.split(/\s+/).length)
                        eobj.props.class = arr.join(' ');
                }
            });
            if (selectedClassName === cname) selectedClassName = null;
            pushHistory();
            render();
            updatePropsForm();
            renderClassEditor();
            renderClassPropertiesForm();
        }
    };

    renderClassPropertiesForm();
}

/**
 * Renders the form for editing properties of the selected class.
 * Updates the form and binds input events for live editing.
 */
function renderClassPropertiesForm() {
    let form = document.getElementById('classPropertiesEditor');
    if (!form) return;

    let html = `<div id="classTitle">Class Properties` + (selectedClassName ? `: <b>.${escapeHTML(displayClassName(selectedClassName))}</b>` : ``) + `</div>`
    if (!selectedClassName || !(selectedClassName in classStyles)) {
        form.innerHTML = html;
        form.oninput = null;
        return;
    }

    let st = styleStringToObj(classStyles[selectedClassName]);
    html += renderStyleFields(st);

    form.innerHTML = html;

    form.oninput = function (e) {
        let styleObj = styleStringToObj(classStyles[selectedClassName]);
        fetchStyleFromFields(form, styleObj);
        classStyles[selectedClassName] = styleObjToString(styleObj);
        pushHistory();
        render();
        renderClassEditor();
    };
}