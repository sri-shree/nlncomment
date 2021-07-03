// ==UserScript==
// @name         Get and Flag comment
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Flag Overflow
// @author       Shree: https://stackoverflow.com/users/965146/shree
// @match        *://*.chat.stackoverflow.com/rooms/232981/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==
// change ^ @match where you want to run and get feedback from the script.
let BIT = true;
(function() {
    'use strict';

    const API_KEY = ''; // Your API_KEY
    const Access_Token = ''; // Your Access_Token
    const Site_Name = 'stackoverflow'; // Change site name if needed
    const Room_ID = ' '; // Room to send message
    const Time_Out = 50000;

    flagComment();
    async function flagComment() {

        let getresult = [];
        let resultlength = 0;

        let keywords = [
            "((?:^)@(\\w+)\\b\\s)?thank([\\w.,!\']*)?(\\s[\\w{1,8},.@!:\\-)]*)?(\\s[\\w{1,8},.@!:\\-)]*)?(\\s[\\w{1,8},.@!:\\-)]*)?",
            "glad(?:\\sto\\shelp|hear)?",
            "(appreciate|perfect|awesome|amazing|excellent)(?:,|\w{1,2})?(\\s(?:solution|example)?)?",
            "solv(\\w{1,3})(\\s(\w{2,5}))\\s(\\w{1,9})?",
            "(\\w{1,8}\\s)?up(?:\\s)?vote\\s(\\w{0,8})?\\s(\\w{0,8})?",
            "(\\w{1,5}([\\w{,2}\']*)\\s)?work([\\w*{0,3}!.]*)?(\\s[:\\-)+=.}]*)?",
            "save(\\w{1,3})?\\s(\\w{0,4})\\s([\\w{0,6}.!:\\-)]*)?",
            "([\\w{1,8},.@!:)]*\\s)?(love|cheers|great)(\\s[\\w{1,8},.@!:)]*)?",
            ":\\)| :-\\)|;\\)"

        ];
        let regex = new RegExp(keywords.join("|"), 'gi');

        let ignorkeywords=[
            "not|unfortunate|but|require|need|persists",
            "\\b(doesn|don|didn|couldn|can|isn)(['’])?(\\w{1,2})?\\b",
            "[?]"

        ];
        let igreg = RegExp(ignorkeywords.join("|"), 'gi');


        let response;
        response = await getComments(API_KEY);
        if(response.quota_remaining === '9999')
            sendChatMessage("**Quota_Rollover:**  "+ response.quota_remaining, Room_ID);

        getresult = response.items.map(a => a.body_markdown + " #@# " + a.link + " #@# " + a.comment_id + " #@# " + a.post_id);
        let finalresult = $.grep(getresult, function(elem) {
            return (elem.split(' #@# ')[0].length < 85 && elem.split(' #@# ')[0].match(regex))
        });
        resultlength = finalresult.length;
        //console.log(finalresult);

        if (resultlength > 0) {
            let comment = "";
            let link = "";
            let commentId = "";
            let postID = "";

            $.each(finalresult, function(ind, value) {

                setTimeout(function() {
                    comment = value.split(' #@# ')[0].replaceAll("&#39;","\'");
                    link = value.split(' #@# ')[1];
                    commentId = value.split(' #@# ')[2];
                    postID = value.split(' #@# ')[3];

                    let msg = "";
                    let matches = comment.match(regex) || [];
                    let reason = '';
                    let weight = 0;
                    if (matches.length) {
                        for (var i = 0, l = matches.length; i < l; i++) {
                            reason += '   ---' + $.trim(matches[i]) + '---   ';
                            weight += $.trim(matches[i]).split(" ").length;
                        }
                    } else {
                        reason = "---Secret Reason :)---";
                    }

                    let len = comment.length;
                    msg = '[' + comment + '](' + link + ') **Blacklisted Word:** ' + reason ;
                    if (len < 30){
                        msg += ' **Low length:** ' + len ;
                        weight += 1;
                    }
                    else{
                        msg += ' **Length:** ' + len ;
                    }
                    msg += ' **Weight:** ' + weight;

                    let flag = (BIT === true ? " 🚩" : " 🏳️"); // change flag colar after rich flag limit(100)

                    if ((weight >= 4 && len < 60) || (len < 30 && weight > 2) ||( weight > 6) ||(len == 15)) {

                        if (!comment.match(igreg)){
                            msg +=  flag;
                            if (BIT) {
                                getFlagOption(commentId, API_KEY, Access_Token, Site_Name, Room_ID);
                            }
                        }
                        else
                        {
                            let igmatches = comment.match(igreg) || [];
                            msg += ' **Ignore Word:** ';
                            for (var j = 0, ln = igmatches.length; j < ln; j++) {
                                msg += '   ---' + $.trim(igmatches[j]) + '---   ';

                            }
                            msg += " ❌";

                        }
                    }


                    sendChatMessage(msg, Room_ID);

                }, ind * Time_Out);

            });

        }


    }

    window.setInterval(function() {
        flagComment();
    }, 40 * Time_Out);

    // --- check Bit in every 2 hours for the flag limit until next solution found  ----
    window.setInterval(function(){
        BIT = true;
    }, 72 * Time_Out);
    // --- ------ ------------- ------------------

})();


function getFlagOption(commentId, API_KEY, Access_Token, Site_Name, Room_ID) {

    //FlagMessage 1. Get flag option (it's vary for each comment). 2. Flag comment
    checkOption();
    async function checkOption() {
        let opt = await getFlagOptions(commentId, API_KEY, Access_Token);

        if (typeof opt !== 'undefined' && opt) {
            let optionId = "";
            let optionIDs = opt.items.map(a => a.option_id + " #@# " + a.title);
            optionId = optionIDs[2].split(' #@# ')[0]; // hard coded for no longer needed.
            autoFlag(commentId, optionId, API_KEY, Access_Token, Site_Name);
        }

    }
}

function autoFlag(commentId, optionId, API_KEY, Access_Token, Site_Name) {

    var flag = new XMLHttpRequest();
    flag.open("POST", "https://api.stackexchange.com/2.2/comments/" + commentId + "/flags/add", true);
    flag.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    flag.onload = function(data) {

        let response;
        try {
            response = JSON.parse(this.response);
            if (response.error_name) {
                console.warn(response.error_name);
                BIT=false;
                console.log(BIT);
            }
        }
        catch (e) {

            if(response.error_message != "")
                console.warn(response.error_message);
        }

    }

    flag.send("key=" + API_KEY + "&site=" + Site_Name + "&option_id=" + optionId + "&access_token=" + Access_Token);
}


function getFlagOptions(commentId, API_KEY, Access_Token) {
    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://api.stackexchange.com/2.2/comments/' + commentId + '/flags/options?key=' + API_KEY + '&site=stackoverflow&access_token=' + Access_Token,
            onload: function(data) {
                resolve(JSON.parse(data.responseText));
            }
        });
    });
}


function sendChatMessage(msg, Room_ID) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://chat.stackoverflow.com/rooms/' + Room_ID,
        onload: function(response) {
            var fkey = response.responseText.match(/hidden" value="([\dabcdef]{32})/)[1];
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://chat.stackoverflow.com/chats/' + Room_ID + '/messages/new',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: 'text=' + encodeURIComponent(msg.replaceAll("&#39;","\'")
                                                   .replace(/\n|\r/g, " ")
                                                   .replaceAll("&quot;","\"")
                                                   .trim()) + '&fkey=' + fkey,

                onload: function(r) {

                }
            });
        }
    });
}

function getComments(API_KEY) {

    let d = new Date();
    let dm = new Date(d.setMonth(d.getMonth() - 1));
    let dy = new Date(d.setYear(d.getFullYear() - 1));
    dm = getFormattedDate(dm)
    dy = getFormattedDate(dy)

    let dto = Date.parse(dm);
    let dfrom = Date.parse(dy);
    dto = dto.toString().slice(0, -3);
    dfrom = dfrom.toString().slice(0, -3);

    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: 'GET',
            url:'https://api.stackexchange.com/2.2/comments?page=1&pagesize=100&order=desc&sort=creation&filter=!4(lY7*YmhBbS4j1g_&site=stackoverflow&key=' + API_KEY,
            onload: function(data) {
                resolve(JSON.parse(data.responseText));
            }
        });
    });
}
function getFormattedDate(date) {
    let year = date.getFullYear();
    let month = (1 + date.getMonth()).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
}
