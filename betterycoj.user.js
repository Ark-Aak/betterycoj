// ==UserScript==
// @name         Better YCOJ
// @version      1.1.6
// @description  更好的 YCOJ
// @author       Aak
// @match        http://10.1.143.113/*
// @namespace    http://10.1.143.113
// @icon         https://www.google.com/s2/favicons?sz=64&domain=143.113
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      luogu.com.cn
// @connect      ark-aak.github.io
// @license      MIT
// @require    https://cdn.jsdelivr.net/npm/jquery@3.3.1/dist/jquery.min.js
// @require    https://cdn.jsdelivr.net/npm/jquery-color@2.2.0/dist/jquery.color.min.js
// @require    https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js
// @require    https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js
// ==/UserScript==

let problemDb = null;
let contestDb = null;
let infoDb = null;
let solutionLoaded = false;
let minLen = 1000000000;
const pasteId = "aifqpqnw";
let solutionMapping = [];
const colorMap = ["#7F7F7F", "#FE4C61", "#F39C11", "#FFC116", "#52C41A", "#3498DB", "#9D3DCF", "#0E1D69"];
const diffMap = ["暂无评定", "入门", "普及−", "普及/提高−", "普及+/提高", "提高+/省选−", "省选/NOI−", "NOI/NOI+/CTSC"];
const version = "1.1.6";

function checkUpdate() {
    GM_xmlhttpRequest({
        url: "https://ark-aak.github.io/betterycoj/version",
        method: "GET",
        onload: function(xhr){
            let data = xhr.responseText.split('\n')[0];
            if (data !== version) {
                createNotification("检测到新版本！\n请前往 <a href=\"https://ark-aak.github.io/betterycoj/betterycoj.user.js\">Github</a> 更新。", 20000, 1000, 'rgba(82, 196, 26, 0.8)')
            }
        }
    });
}

function loadMapping() {
    GM_xmlhttpRequest({
        url: "https://www.luogu.com.cn/paste/" + pasteId + "?_contentOnly=1",
        method: "GET",
        onload: async function(xhr){
            let data = JSON.parse(xhr.responseText).currentData.paste.data.split("\n\n");
            for (let i = 0; i < data.length; i++) data[i] = data[i].split(" ");
            for (let i = 0; i < data.length; i++) {
                if (data[i].length >= 5) {
					let tag = data[i][4];
					if (tag === "NOI/NOI+/CTSC") data[i][4] = 7;
					if (tag === "省选/NOI−") data[i][4] = 6;
					if (tag === "提高+/省选−") data[i][4] = 5;
					if (tag === "普及+/提高") data[i][4] = 4;
                    if (tag === "普及/提高−") data[i][4] = 3;
					if (tag === "普及−") data[i][4] = 2;
                    if (tag === "入门") data[i][4] = 1
				}
                minLen = Math.min(minLen, data[i].length);
            }
            solutionMapping = data;
            solutionLoaded = true;
        }
    });
}

unsafeWindow.loadMapping = loadMapping

window.addEventListener('load', function() {
    checkUpdate();
	/*
    let intervalId = setInterval(() => {
        if(unsafeWindow.editor && "function" == typeof unsafeWindow.define && unsafeWindow.define.amd) {
            console.log("detected monaco editor.");
            delete unsafeWindow.define.amd;
            loadScript();
            clearInterval(intervalId);
        }
    }, 10);
    setTimeout(() => {
        if("function" == typeof unsafeWindow.define && unsafeWindow.define.amd) {
            delete unsafeWindow.define.amd;
            loadScript();
            clearInterval(intervalId);
            return;
        }
        if (!unsafeWindow.editor) {
            loadScript();
            clearInterval(intervalId);
            return;
        }
    }, 100);//处理Monaco Editor
	*/
    //setTimeout(() => {
		try {
            problemDb = localforage.createInstance({
                name: "problem"
            });
            contestDb = localforage.createInstance({
                name: "contest"
            });
            infoDb = localforage.createInstance({
                name: "info"
            });
		}
		catch (e) {
			console.log(e);
			createNotification("Localforage 未加载，可能是刷新过于频繁。", 3000, 1000, 'rgba(231, 76, 60, 0.8)')
		}
    //}, 200);
    //傻逼Monaco
    loadMapping();
});

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.classList.add('notification-container');
    document.body.appendChild(container);
    return container;
}

const notificationContainer = createNotificationContainer();
const isModified = false;

const defaultBackgroundColor = 'rgba(0, 0, 0, 0.8)';
const defaultColor = 'white'
function createNotification(message, displayTime, fadeoutTime, backgroundColor = defaultBackgroundColor, textColor = defaultColor) {
    const notification = document.createElement('div');
    notification.style.bottom = '20px';
    notification.style.marginBottom = '5px';
    notification.style.right = '20px';
    notification.style.backgroundColor = backgroundColor;
    notification.style.color = textColor;
    notification.style.padding = '10px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    notification.innerHTML = message;
    notification.style.whiteSpace = 'pre-wrap';

    setTimeout(() => {
        notification.style.animation = 'fadeout ' + fadeoutTime / 1000 + 's ease forwards';
        notification.addEventListener('animationend', () => {
            notification.remove();
        });
    }, displayTime);

    notificationContainer.appendChild(notification);
}

function getCookieUsername() {
    return JSON.parse(getCookie("login"))[0];
}

function redirect(path) {
    window.location.href = location.protocol + '//' + location.host + path;
}

const username = async () => {
    await searchUser(getCookieUsername());
    if (getCookie("login") !== "") return getCookie("b-username");
    return "";
}
const userId = async () => {
    await searchUser(getCookieUsername());
    if (getCookie("login") !== "") return getCookie("b-userId");
    return "";
}
const isAdmin = async () => {
    return await userId() <= 2;
}

const searchUser = async (username) => {
    await $.ajax({
        url: "/api/v2/search/users/" + username,
        type: "GET",
        async: true,
        success: function(data) {
            if (data.success === false || data.results.length < 1) {
                createNotification("无法获取 userId。\n请登录后使用。", 3000, 1000, 'rgba(231, 76, 60, 0.8)')
                return;
            }
            let userId = data.results[0].value;
            let username = data.results[0].name;
            setCookie("b-userId", userId);
            setCookie("b-username", username);
        }
    });
}

function encryptAES(text, key) {
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    return encrypted;
}

function decryptAES(ciphertext, key) {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8);
    return decrypted;
}

function encrypt(content) {
    const aesKey = CryptoJS.lib.WordArray.random(16).toString();
    return btoa("BetterYCOJ debug: " + aesKey + "#" + encryptAES(content, aesKey));
}

function decrypt(content) {
    content = atob(content).split("BetterYCOJ debug: ")[1];
    let key = content.split('#')[0];
    let text = content.split('#')[1];
    return decryptAES(text, key);
}

function setCookie(cookieName, cookieValue) {
    const expirationDate = new Date('9999-12-31');
    const expires = "expires=" + expirationDate.toUTCString();
    document.cookie = cookieName + "=" + encodeURIComponent(cookieValue) + "; " + expires + "; path=/";
}

function getCookie(cookieName) {
    const name = cookieName + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for(let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return "";
}

async function setInfo(name, val) {
    await infoDb.setItem(name, val);
}

async function getInfo(name) {
    return await infoDb.getItem(name);
}

function changeAccount() {
    var tmp = getCookie("b-login-1");
    setCookie("login", getCookie("b-login-2"));
    setCookie("b-login-1", getCookie("b-login-2"));
    setCookie("b-login-2", tmp);
    setCookie("connect.sid", "");
    let nowAccount = getCookie("login");
    let pattern = /\[\"(.*?)\",\"(.*?)\"\]/;
    let matches = nowAccount.match(pattern);
    if (matches) return matches;
    return null;
}

unsafeWindow.changeAccount = changeAccount;

window.addEventListener('load', () => {
    $('.header.item img').each(function() {
        $(this).replaceWith('<span style="font-family: \'Exo 2\'; font-size: 1.5em; font-weight: 600; ">YCOJ</span>');
    });
    let cookieWelcome = getCookie("b-welcome");
    if (cookieWelcome !== "true") {
        const customMessage = '欢迎使用 Better YCOJ';
        createNotification(customMessage, 3000, 1000);
        setCookie("b-welcome", "true")
    }
});

const style = document.createElement('style');
style.textContent = `
        @keyframes fadeout {
            from {opacity: 1;}
            to {opacity: 0;}
        }
        .header.item img {display: none !important;}
        .notification-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column-reverse;
            align-items: flex-end;
        }
        #overlay {
            position: fixed;
            top: 0;left: 0;width: 100%;height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 9999;display: none;
        }
        #popup {
            position: fixed;
            top: 50%;left: 50%;
            transform: translate(-50%, -50%);
            background-color: #fff;
            padding: 20px;z-index: 10000;
            border-radius: 5px;display: none;
        }
        #closeBtn {
            position: absolute;
            top: 5px;right: 5px;
            cursor: pointer;
        }
        .closePopup:hover {color: red;}
        #popupButtons {margin-top: 20px;}
        #confirmBtn,
        #cancelBtn {
            padding: 8px 12px;margin-right: 10px;
            cursor: pointer;border: 1px solid #ccc;
            background-color: #f9f9f9;border-radius: 3px;
        }
    `;
document.head.appendChild(style);

const popupHTML = `
        <div id="overlay"></div>
        <div id="popup">
            <div id="closeBtn" class="closePopup"><i class=\"delete icon\"></i></div>
            <div id="popupContent">
                <h3 id="popupTitle" class="popupTitle"></h3>
                <p id="popupMessage"></p>
            </div>
            <div class="ui form" id="popupForm" style="margin-top:5px">
                <div class="field" id="popupTextbox">
                    <input id="popupText" type="text" placeholder="请输入内容"></input>
                </div>
                <div class="field" id="popupButtons">
                    <button id="confirmBtn">确定</button>
                    <button id="cancelBtn">取消</button>
                </div>
            </div>
        </div>
    `;

document.body.insertAdjacentHTML('beforeend', popupHTML);

function processNewline(text) {
    return text.replace(/\n/g, '<br />');
}

function openPopup(title, message, button = false, textbox = false, callback) {
    $('#popupTitle').text(title);
    $('#popupMessage').html(processNewline(message));
    $('#overlay').fadeIn();
    $('#popup').fadeIn();
    if (button == true) $('#popupButtons').show();
    else $('#popupButtons').hide();
    if (textbox == true) {
        $('#popupText').val('');
        $('#popupTextbox').show();
    }
    else $('#popupTextbox').hide();
    if (button == false && textbox == false) $('popupForm').hide();

    $('#confirmBtn').off("click");
    $('#cancelBtn').off("click");

    $('#confirmBtn').click(function() {
        if (callback && typeof callback === 'function') {
            callback('confirmed', $('#popupText').val());
        }
        closePopup();
    });

    $('#cancelBtn').click(function() {
        if (callback && typeof callback === 'function') {
            callback('canceled', $('#popupText').val());
        }
        closePopup();
    });
}

function closePopup() {
    $('#overlay').fadeOut();
    $('#popup').fadeOut();
}

document.getElementById('closeBtn').addEventListener('click', closePopup);

function changeAccountWithPopup() {
    const ret = changeAccount();
    if (!ret) {
        createNotification("未知错误！\n可能 Cookie 被人为修改。", 3000, 1000, 'rgba(231, 76, 60, 0.8)')
        return false;
    }
    openPopup("账号切换", "切换成功！即将刷新...\n目标账号：" + ret[1] + "\n密码 Hash：" + ret[2], false, false)
    setTimeout(() => {
        location.reload();
    }, 1200)
    return true;
}

async function buildContestIndex(status, content) {
    if (status !== "confirmed") return;
    let id = await getInfo("last-build-contest");
    id = parseInt(id);
    if (!id) id = 0;
    let flg = true;
    let keyval = [];
    while (flg) {
        id += 1;
        await $.ajax({
            url: "/contest/" + id + "/edit",
            type: "GET",
            async: true,
            success: async function (data) {
                if (data.includes("<title>新建比赛")) {
                    flg = false;
                    return;
                }
                let regex = /<option value="(\d+)" selected>#\1\. [^<]+<\/option>/g;
                let text = data;
                let matches = text.match(regex);
                let cregex = /<form action="\/contest\/(\d+)\/edit" method="post">/
                let cid = text.match(cregex)[1];
                console.log("building contest " + cid);
                if (!matches) {
                    console.log("contest id = " + cid + " have no problem");
                    return;
                }
                let pidc = [];
                for (let i = 0; i < matches.length; i++) {
                    let prob = matches[i];
                    let regex_id = /<option value="(\d+)" selected>#\1\. [^<]+<\/option>/;
                    let mid = prob.match(regex_id);
                    let pid = mid[1];
                    console.log("found problem id = " + pid + " cid = " + cid);
                    pidc.push(pid);
                    let item = await contestDb.getItem("problem." + pid);
                    if (!item) item = [];
                    item.push(cid);
                    await contestDb.setItem("problem." + pid, item);
                }
                await contestDb.setItem("contest." + cid, pidc);
                console.log("contest " + cid + " done. found " + pidc.length + " problem(s)");
            }
        });
        if (!flg) break;
    }
    await setInfo("last-build-contest", id - 1);
}

async function getProblemContent(id) {
    await $.ajax({
        url: "/problem/" + id + "/edit",
        type: "GET",
        async: true,
        success: async function (data) {
            let text = $($(data).find("textarea")[0]).text();
            await problemDb.setItem("content." + id, text);
            console.log("problem " + id + " done.");
        }
    });
}

async function buildProblemIndex(status, content) {
    if (status !== "confirmed") return;
    let id = await getInfo("last-build-problem");
    id = parseInt(id);
    if (!id) id = 0;
    let flg = true;
    let keyval = [], count = 0;
    while (flg) {
        id += 1;
        await $.ajax({
            url: "/problem/" + id,
            type: "GET",
            async: true,
            success: async function (data) {
                if (data.includes("无此题目。")) {
                    count ++;
                    if (count >= 25) {
                        flg = false;
                        console.log("problem index building finished.");
                    }
                    console.log("count -> " + count);
                    return;
                }
                console.log("getting problem " + id);
                count = 0;
                await getProblemContent(this.url.split("/problem/")[1]);
            }
        });
        if (!flg) break;
    }
    await setInfo("last-build-problem", id - 1);
}

function copyContent(content) {
    let copyResult = true
    const text = content || '';
    if (!!window.navigator.clipboard) {
        window.navigator.clipboard.writeText(text).then((res) => {
            createNotification("复制成功！", 3000, 1000, 'rgba(82, 196, 26, 0.8)')
            return copyResult;
        }).catch((err) => {
            createNotification("复制失败！", 3000, 1000, 'rgba(231, 76, 60, 0.8)')
            copyResult = false
            return copyResult;
        })
    } else {
        let inputDom = document.createElement('textarea');
        inputDom.setAttribute('readonly', 'readonly');
        inputDom.value = text;
        document.body.appendChild(inputDom);
        inputDom.select();
        const result = document.execCommand('copy')
        if (result) {
            createNotification("复制成功！", 3000, 1000, 'rgba(82, 196, 26, 0.8)')
        } else {
            createNotification("复制失败！", 3000, 1000, 'rgba(231, 76, 60, 0.8)')
            copyResult = false
        }
        document.body.removeChild(inputDom);
        return copyResult;
    }
}

if (getCookie("login") !== "") {
    var element = $("<a class=\"item\" href=\"javascript:void(0)\"><i class=\"repeat icon\"></i>切换账号</a>")
    var Telement = $("<a class=\"item\" href=\"javascript:void(0)\"><i class=\"info icon\"></i>Ver " + version + "</a>")
    element.click(() => {
        if (getCookie("b-login-2") == "") {
            createNotification("切换失败！未找到上次登录记录。", 3000, 1000, 'rgba(231, 76, 60, 0.8)')
            return;
        }
        changeAccountWithPopup()
    });
    $(".ui.simple.dropdown.item div").prepend(element);
    $(".ui.simple.dropdown.item div").prepend(Telement);
}

if ($('div.header:contains("您没有权限进行此操作。")').length > 0) {
    openPopup("权限检测", "检测到您没有权限访问此页面，是否希望切换到另一账号。", true, false, (status, content) => {
        if (status === "confirmed") {
            setTimeout(changeAccountWithPopup, 350);
        }
    });
}

function renderSearchResult(result) {
    let content = "";
    for (let i = 0; i < Math.min(10, result.length); i++) {
        content += "<a href=\"/problem/" + result[i] + "\">" + result[i] + "</a>\n";
    }
    openPopup("搜索结果", content);
}

function searchProblemByContent(searchString) {
    let ids = [];
    problemDb.iterate(function (value, key, iterationNumber) {
        if (value && value.includes(searchString)) {
            key = key.split("content.")[1];
            ids.push(key);
            console.log('Found matching problem:', key);
        }
    }).then(function () {
        console.log('Search completed');
        console.log(ids);
        renderSearchResult(ids);
    }).catch(function (err) {
        console.error('Error searching:', err);
    });
}

unsafeWindow.searchProblemByContent = searchProblemByContent;

if (window.location.pathname.match(/\/problems\/?$/) && window.location.pathname.match(/^\/problems\/?/)) {
    $('tr').each(function() {
        const tds = $(this).find('td');
        if (tds.length >= 3) {
            const lk = tds.eq(2).find('a');
            const download = $("<a href=\"" + lk.attr("href") + "/testdata/download\"><i class=\"download icon\" style=\"color: gray\"></i></a>");
            tds.eq(2).prepend(download);
        }
    });
    if (await isAdmin()) {
        const element = $("<a href=\"javascript:void(0)\" class=\"ui mini labeled icon right floated button\" style=\"margin-left: 5px; \"> <i class=\"ui icon search\"></i> 构建索引 </a>");
        element.click(() => {
            openPopup("构建索引", "是否确认构建题面索引？\n点击确定按钮后可以打开 F12 控制台查看情况。\n请不要刷新界面。", true, false, buildProblemIndex);
        });
        const clear = $("<a href=\"javascript:void(0)\" class=\"ui mini labeled icon right floated button\" style=\"margin-left: 5px; \"> <i class=\"ui icon delete\"></i> 清除数据 </a>");
        clear.click(() => {
            openPopup("清除数据", "是否确认清除数据？\n这将导致所有缓存的内容丢失。", true, false, async (status, content) => {
                if (status === "confirmed") {
                    problemDb.clear();
                    await setInfo("last-build-problem", 0);
                    createNotification("清除成功！", 3000, 1000, 'rgba(82, 196, 26, 0.8)');
                }
            });
        });
        const search = $("<a href=\"javascript:void(0)\" class=\"ui mini labeled icon right floated button\" style=\"margin-left: 5px; \"> <i class=\"ui icon search\"></i> 搜索题目 </a>");
        search.click(() => {
            openPopup("搜索题目", "请在下方输入题面关键字。", true, true, (status, content) => {
                if (content == "") {
                    setTimeout(() => {openPopup("搜索题目", "题面关键字不可为空！")}, 350)
                }
                else {
                    setTimeout(() => {searchProblemByContent(content)}, 350);
                }
            });
        });
        $('#add_problem_dropdown')
            .parent()
            .before(element)
            .before(clear)
            .after(search);
    }
}

function searchSolutionByTitle(title) {
    if (!solutionLoaded) return [];
    let res = [];
    for (let i = 0; i < solutionMapping.length; i++) {
        let text = solutionMapping[i][0];
        if (title.includes(text)) res.push("<a href=\"" + solutionMapping[i][1] + "\"> CQYC题解站-" + solutionMapping[i][1].split("/p/")[1] + "</a>");
    }
    return res;
}

function searchSolutionByHash(hash) {
    if (!solutionLoaded) return [];
    let res = [];
    for (let i = 0; i < solutionMapping.length; i++) {
        let text = solutionMapping[i][2];
        if (hash === text) {
			res.push("<a href=\"" + solutionMapping[i][1] + "\"> CQYC题解站-" + solutionMapping[i][1].split("/p/")[1] + "</a>");
			break;
		}
    }
    return res;
}

function getDifficulty(hash) {
    if (!solutionLoaded || solutionMapping[0].length < 5) return 0;
    let res = 0;
    for (let i = 0; i < solutionMapping.length; i++) {
        let text = solutionMapping[i][2];
        if (hash === text) {
			res = solutionMapping[i][4];
			break;
		}
    }
    return res;
}

function getShitScore(hash) {
    if (!solutionLoaded || solutionMapping[0].length < 5) return 0;
    let res = 0;
    for (let i = 0; i < solutionMapping.length; i++) {
        let text = solutionMapping[i][2];
        if (hash === text) {
			res = solutionMapping[i][3];
			break;
		}
    }
    return res;
}

if (window.location.pathname.match(/\/problem\/(\d+)\/?$/) && window.location.pathname.match(/^\/problem\/(\d+)\/?/)) {
    setTimeout(async () => {
        let pid = parseInt(window.location.pathname.match(/\/problem\/(\d+)\/?$/)[1]);
        if (!pid) pid = 0;
        const row = $($($.find("div.ui.grid")[1]).find("div.row")[1]);
        let text = "<div class=\"row\"><div class=\"column\"><h4 class=\"ui top attached block header\">比赛</h4><div class=\"ui bottom attached segment font-content\"><div style=\"position: relative; overflow: hidden; \">"
        let lst = await contestDb.getItem("problem." + pid);
        if (lst) {
            for (let i = 0; i < lst.length; i++) {
                text = text + "<a href=\"/contest/" + lst[i] + "\">" + lst[i] + "</a>";
                if (i != lst.length - 1) text = text + "<br />";
            }
            text = text + "</div></div> </div> </div>";
            row.before($(text));
        }
    }, 800);
}

unsafeWindow.copyContent = copyContent;

function showPopupError(content) {
	openPopup("出错了", content + "</br> 是否重新加载页面？", true, false, (status, content) => {
		if (status === "confirmed") {
        	location.reload();
		}
    });
}

if (window.location.pathname.match(/\/contest\/\d+\/problem\/\d+\/?$/) && window.location.pathname.match(/^\/contest\/\d+\/problem\/\d+\/?/)) {
    let piId = setInterval(async () => {
        if (!solutionLoaded) return;
        clearInterval(piId);
        if (!$("h1.ui.header")) return;
        const title = $("h1.ui.header")[0].innerText;
        const row = $($($.find("div.ui.grid")[1]).find("div.row")[1]);
        const hash = CryptoJS.SHA256((row.find("p")[0].innerHTML)).toString();
        let text = "<div class=\"row\"><div class=\"column\"><h4 class=\"ui top attached block header\">匹配的题解 <button id=\"copyhash\" class=\"ui labeled mini button\" onclick=\"window.copyContent('" + hash + "')\">复制摘要</button></h4><div class=\"ui bottom attached segment font-content\"><div style=\"position: relative; overflow: hidden; \">"
        let lst;
        if (solutionMapping.length < 1 || (minLen < 2)) {
			showPopupError("数据库出错或丢失！");
            return;
        }
        const contestId = window.location.pathname.match(/\/contest\/(\d+)\/problem\/\d+\/?$/)[1];
        let inContest = false;
        await $.ajax({
            url: "/contest/" + contestId,
            type: "GET",
            async: true,
            success: async function (data) {
                const timeArray = $(data).find("div.ui.label.pointing");
                const timeDiff = Date.parse(timeArray[1].innerHTML) - Date.parse(timeArray[0].innerHTML);
                console.log(timeDiff);
                if (timeDiff <= 18000000) inContest = true;
            }
        });
        if (minLen == 2) lst = searchSolutionByTitle(title)
		else lst = searchSolutionByHash(hash)
        if (lst) {
            if (inContest) text = text + "禁止在正常考试中查看。请在订正赛中查看。";
            else {
                for (let i = 0; i < lst.length; i++) {
                    text = text + lst[i];
                    if (i != lst.length - 1) text = text + "<br />";
                }
                if (lst.length == 0) text = text + "暂无题解 QAQ（<a href=\"https://www.cnblogs.com/cqyc-sol/p/18084018\">我要编写</a>）"
            }
            text = text + "</div></div> </div> </div>";
            row.before($(text));
        }
        if (minLen >= 5) {
            const tagDiv = $($(".ui.center.aligned.grid").find("div.row")[2]);
            const spanList = tagDiv.find("span");
            const spanLen = spanList.length;
            const lstTag = $(spanList[spanLen - 1]);
            if (!inContest) {
                const dif = getDifficulty(hash);
                const color = colorMap[dif];
                const diffElement = $("<span class=\"ui label\">" + diffMap[dif] + "</span>");
                diffElement.css("color", 'rgb(255, 255, 255)');
                diffElement.css("background-color", color);
                lstTag.after(diffElement);
                let shitElement;
                const score = getShitScore(hash);
                if (!score) shitElement = $("<span class=\"ui label\">暂无评定</span>")
                else shitElement = $("<span class=\"ui label\">" + score + "💩</span>")
                diffElement.before(shitElement);
            }
            else {
                const hint = $("<span class=\"ui label\"> 无法查看 </span>");
                hint.css("color", 'rgb(255, 255, 255)');
                hint.css("background-color", "rgb(0, 0, 0)");
                lstTag.after(hint);
            }
		}
    }, 20);
}

if (window.location.pathname.match(/\/contests\/?$/)) {
    if (await isAdmin()) {
        const element = $("<a href=\"javascript:void(0)\" class=\"ui mini labeled icon right floated button\" style=\"margin-left: 5px; \"> <i class=\"ui icon search\"></i> 构建索引 </a>");
        element.click(() => {
            openPopup("构建索引", "是否确认构建比赛索引？\n点击确定按钮后可以打开 F12 控制台查看情况。\n请不要刷新界面。", true, false, buildContestIndex);
        });
        const clear = $("<a href=\"javascript:void(0)\" class=\"ui mini labeled icon right floated button\" style=\"margin-left: 5px; \"> <i class=\"ui icon delete\"></i> 清除数据 </a>");
        clear.click(() => {
            openPopup("清除数据", "是否确认清除数据？\n这将导致所有缓存的内容丢失。", true, false, async (status, content) => {
                if (status === "confirmed") {
                    contestDb.clear();
                    await setInfo("last-build-contest", 0);
                    createNotification("清除成功！", 3000, 1000, 'rgba(82, 196, 26, 0.8)');
                }
            });
        });
        const dec = $("<a href=\"javascript:void(0)\" class=\"ui mini labeled icon right floated button\" style=\"margin-left: 5px; \"> <i class=\"ui icon exchange\"></i> 解密 </a>");
        dec.click(() => {
            openPopup("解密数据", "请在下方输入数据。", true, true, async (status, content) => {
                if (status === "confirmed") {
                    try {
                        content = decrypt(content);
                        setTimeout(() => {
                            openPopup("解密数据", "解密结果为：\n" + content);
                        }, 350);
                    }
                    catch (e) {
                        setTimeout(() => {
                            openPopup("解密数据", "解密出错！\n" + e);
                        }, 350);
                    }
                }
            });
        });
        const e = $('[href="/contest/0/edit"]')
            .parent()
            .append(element)
            .append(clear)
        ;
        if (isModified == false) e.append(dec);
    }
}

if (window.location.pathname.match(/\/contest\/\d+\/submissions/)) {
    const elements = $.find("b");
    for (let i = 0; i < elements.length; i++) {
        let element = elements[i];
        if (element.innerText.match(/#\d+/)) {
            const id = element.innerText.match(/#(\d+)/)[1];
            element.innerHTML = "<a href = \"/contest/submission/" + id + "\">" + element.innerText + "</a>";
        }
    }
}

if (window.location.pathname.match(/\/login\/?$/)) {
    const afterLogin = async (username, password) => {
        searchUser(username);
        const uid = await userId();
    }
    const MySuccess = (session_id, status, username, password) => {
        if (status == 1) createNotification("登录成功！即将重定向...\n登录途径：密码原文", 3000, 1000, 'rgba(82, 196, 26, 0.8)')
        if (status == 2) createNotification("登录成功！即将重定向...\n登录途径：密码 Hash", 3000, 1000, 'rgba(82, 196, 26, 0.8)')
        if (status == 3) createNotification("登录成功！即将重定向...\n登录途径：Cookie", 3000, 1000, 'rgba(82, 196, 26, 0.8)')
        $("#login").stop(true, true);
        $("#login").animate({ backgroundColor: "#52C41A", color: defaultColor }, 300);
        $("#login").text("登录成功");
        $("#login").removeClass("loading");
        if (getCookie("login") !== getCookie("b-login-1")) {
            setCookie("b-login-2", getCookie("b-login-1"));
            setCookie("b-login-1", getCookie("login"));
        }
        afterLogin(username, password);
        setTimeout(() => {
            window.location.href = location.protocol + '//' + location.host + "\u002F";
        }, 1200)
    };
    const show_error = (error) => {
        createNotification("登录失败！原因：" + error, 3000, 1000, 'rgba(231, 76, 60, 0.8)')
        $("#login").stop(true, true);
        $("#login").removeClass("loading");
        $("#login").text("登录失败");
        $("#login").animate({ backgroundColor: "#E74C3C", color: defaultColor }, 300);
        setTimeout(() => {
            $("#login").stop(true, true);
            $("#login").animate({ backgroundColor: "#E0E1E2", color: 'rgba(0,0,0,.6)' }, 300, () => {
                $("#login").text("登录");
            });
            $('#login').off("mouseenter");
            $('#login').off("mouseleave");
            $('#login').mouseenter(function(){
                $(this).stop(true, true);
                $(this).animate({ backgroundColor: "#0E90D2", color: defaultColor }, 300); // 鼠标进入时渐变到指定颜色
            });
            $('#login').mouseleave(function(){
                $(this).stop(true, true);
                $(this).animate({ backgroundColor: "#E0E1E2", color: 'rgba(0,0,0,.6)' }, 300);
            });
        }, 1100);
    }
    $('#login').mouseleave(function(){
        $(this).stop(true, true);
        $(this).animate({ backgroundColor: "#E0E1E2", color: 'rgba(0,0,0,.6)' }, 300);
    });
    $('#login').mouseenter(function(){
        $(this).stop(true, true);
        $(this).animate({ backgroundColor: "#0E90D2", color: defaultColor }, 300); // 鼠标进入时渐变到指定颜色
    });
    $('#password').attr('placeholder', '密码 / Hash / Cookie');
    $("#login").click(function() {
        $('#login').off("mouseenter");
        $('#login').off("mouseleave");
        $('#login').mouseenter(function(){});
        $('#login').mouseleave(function(){});
    });
    login = () => {
        let val = $("#password").val();
        var password = md5(val + "syzoj2_xxx");
        $("#login").addClass("loading");
        let pattern = /%22%2C%22(.*?)%22%5D/;
        let matches = val.match(pattern);
        var flg = 0;
        if (matches) {
            val = matches[1];
            flg = 3;
        }
        $.ajax({
            url: "/api/login",
            type: 'POST',
            data: {
                "username": $("#username").val(),
                "password": password
            },
            async: true,
            success: function(data) {
                var error_code = data.error_code;
                switch (error_code) {
                    case 1001:
                        show_error("用户不存在");
                        break;
                    case 1002:
                        $.ajax({
                            url: "/api/login",
                            type: 'POST',
                            data: {
                                "username": $("#username").val(),
                                "password": val
                            },
                            async: true,
                            success: function(data) {
                                var error_code = data.error_code;
                                switch (error_code) {
                                    case 1001:
                                        show_error("用户不存在");
                                        break;
                                    case 1002:
                                        show_error("密码错误");
                                        break;
                                    case 1003:
                                        show_error("您尚未设置密码，请通过下方「找回密码」来设置您的密码。");
                                        break;
                                    case 1:
                                        MySuccess(data.session_id, Math.max(flg, 2), $("#username").val(), $("#password").val());
                                        return;
                                    default:
                                        show_error("未知错误");
                                        break;
                                }
                            },
                            error: function(XMLHttpRequest, textStatus, errorThrown) {
                                alert(XMLHttpRequest.responseText);
                                show_error("未知错误");
                            }
                        });
                        break;
                    case 1003:
                        show_error("您尚未设置密码，请通过下方「找回密码」来设置您的密码。");
                        break;
                    case 1:
                        MySuccess(data.session_id, 1, $("#username").val(), $("#password").val());
                        return;
                    default:
                        show_error("未知错误");
                        break;
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                alert(XMLHttpRequest.responseText);
                show_error("未知错误");
            }
        });
    }
}
