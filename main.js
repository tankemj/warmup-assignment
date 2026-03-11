const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss






function getShiftDuration(startTime, endTime) {

    function toSeconds(time) {
        let parts = time.split(" ");
        let timeParts = parts[0].split(":");

        let h = parseInt(timeParts[0]);
        let m = parseInt(timeParts[1]);
        let s = parseInt(timeParts[2]);
        let period = parts[1];

        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    let diff = end - start;

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    return h + ":" + String(m).padStart(2,"0") + "::" + String(s).padStart(2,"0");
}
// ============================================================

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    function toSeconds(time) {
        let parts = time.split(" ");
        let t = parts[0].split(":");

        let h = parseInt(t[0]);
        let m = parseInt(t[1]);
        let s = parseInt(t[2]);
        let period = parts[1];

        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    let deliveryStart = 8 * 3600;        
    let deliveryEnd = 22 * 3600;         

    let idleSeconds = 0;

    if (start < deliveryStart) {
        idleSeconds += Math.min(end, deliveryStart) - start;
    }

    if (end > deliveryEnd) {
        idleSeconds += end - Math.max(start, deliveryEnd);
    }

    if (idleSeconds < 0) {
        idleSeconds = 0;
    }

    let h = Math.floor(idleSeconds / 3600);
    let m = Math.floor((idleSeconds % 3600) / 60);
    let s = idleSeconds % 60;

    return h + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}
// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function toSeconds(time) {
        let parts = time.split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);

        return h * 3600 + m * 60 + s;
    }

    let shift = toSeconds(shiftDuration);
    let idle = toSeconds(idleTime);

    let diff = shift - idle;

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    return h + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    function toSeconds(time) {
        let parts = time.split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);

        return h * 3600 + m * 60 + s;
    }

    let activeSeconds = toSeconds(activeTime);
    let requiredSeconds;

    if (date >= "2025-04-10" && date <= "2025-04-30") {
        requiredSeconds = 6 * 3600;
    } else {
        requiredSeconds = 8 * 3600 + 24 * 60;
    }

    return activeSeconds >= requiredSeconds;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let content = "";

    if (fs.existsSync(textFile)) {
        content = fs.readFileSync(textFile, "utf8").trim();
    }

    let lines = [];
    if (content !== "") {
        lines = content.split("\n");
    }

    for (let i = 0; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0] === shiftObj.driverID && cols[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quota = metQuota(shiftObj.date, activeTime);

    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quota,
        hasBonus: false
    };

    let newLine =
        newRecord.driverID + "," +
        newRecord.driverName + "," +
        newRecord.date + "," +
        newRecord.startTime + "," +
        newRecord.endTime + "," +
        newRecord.shiftDuration + "," +
        newRecord.idleTime + "," +
        newRecord.activeTime + "," +
        newRecord.metQuota + "," +
        newRecord.hasBonus;

    let lastIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0] === shiftObj.driverID) {
            lastIndex = i;
        }
    }

    if (lastIndex === -1) {
        lines.push(newLine);
    } else {
        lines.splice(lastIndex + 1, 0, newLine);
    }

    fs.writeFileSync(textFile, lines.join("\n"));

    return newRecord;
}
// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

    let data = fs.readFileSync(textFile, "utf8").trim().split("\n");

    for (let i = 0; i < data.length; i++) {

        let cols = data[i].split(",");

        if (cols[0] === driverID && cols[2] === date) {
            cols[9] = newValue.toString();
            data[i] = cols.join(",");
        }
    }

    fs.writeFileSync(textFile, data.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile, "utf8").trim();

    if (data === "") {
        return -1;
    }

    let lines = data.split("\n");
    let bonusCount = 0;
    let driverExists = false;

    let targetMonth = parseInt(month);

    for (let i = 0; i < lines.length; i++) {

        let cols = lines[i].split(",");

        if (cols[0] === driverID) {

            driverExists = true;

            let dateParts = cols[2].split("-");
            let recordMonth = parseInt(dateParts[1]);

            if (recordMonth === targetMonth && cols[9].trim() === "true") {
                bonusCount++;
            }
        }
    }

    if (!driverExists) {
        return -1;
    }

    return bonusCount;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile, "utf8").trim().split("\n");

    let totalSeconds = 0;

    for (let i = 0; i < data.length; i++) {
        let cols = data[i].split(",");

        if (cols[0] === driverID) {
            let dateParts = cols[2].split("-");
            let recordMonth = parseInt(dateParts[1]);

            if (recordMonth === parseInt(month)) {
                let timeParts = cols[7].split(":");
                let h = parseInt(timeParts[0]);
                let m = parseInt(timeParts[1]);
                let s = parseInt(timeParts[2]);

                totalSeconds += h * 3600 + m * 60 + s;
            }
        }
    }

    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

    let rateData = fs.readFileSync(rateFile, "utf8").trim();
    let shiftData = fs.readFileSync(textFile, "utf8").trim();

    if (rateData === "" || shiftData === "") {
        return "0:00:00";
    }

    let rateLines = rateData.split("\n");
    let shiftLines = shiftData.split("\n");

    let dayOff = "";

    for (let i = 0; i < rateLines.length; i++) {
        let cols = rateLines[i].split(",");

        if (cols[0] === driverID) {
            dayOff = cols[1].trim();
            break;
        }
    }

    if (dayOff === "") {
        return "0:00:00";
    }

    let totalSeconds = 0;
    let targetMonth = parseInt(month);

    let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (let i = 0; i < shiftLines.length; i++) {
        let cols = shiftLines[i].split(",");

        if (cols[0] === driverID) {
            let date = cols[2].trim();
            let dateParts = date.split("-");

            let year = parseInt(dateParts[0]);
            let recordMonth = parseInt(dateParts[1]);
            let day = parseInt(dateParts[2]);

            if (recordMonth === targetMonth) {
                let currentDate = new Date(year, recordMonth - 1, day);
                let currentDayName = days[currentDate.getDay()];

                if (currentDayName !== dayOff) {
                    if (date >= "2025-04-10" && date <= "2025-04-30") {
                        totalSeconds += 6 * 3600;
                    } else {
                        totalSeconds += 8 * 3600 + 24 * 60;
                    }
                }
            }
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;

    if (totalSeconds < 0) {
        totalSeconds = 0;
    }

    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}
// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    function toSeconds(time) {
        let parts = time.split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);

        return h * 3600 + m * 60 + s;
    }

    let data = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < data.length; i++) {
        let cols = data[i].split(",");

        if (cols[0] === driverID) {
            basePay = parseInt(cols[2]);
            tier = parseInt(cols[3]);
            break;
        }
    }

    let actualSeconds = toSeconds(actualHours);
    let requiredSeconds = toSeconds(requiredHours);

    if (actualSeconds >= requiredSeconds) {
        return basePay;
    }

    let allowedMissingHours = 0;

    if (tier === 1) {
        allowedMissingHours = 50;
    } else if (tier === 2) {
        allowedMissingHours = 20;
    } else if (tier === 3) {
        allowedMissingHours = 10;
    } else if (tier === 4) {
        allowedMissingHours = 3;
    }

    let missingSeconds = requiredSeconds - actualSeconds;
    let missingHours = Math.floor(missingSeconds / 3600);

    let actualMissingHours = missingHours - allowedMissingHours;

    if (actualMissingHours < 0) {
        actualMissingHours = 0;
    }

    let deductionRatePerHour = Math.floor(basePay / 185);
    let salaryDeduction = actualMissingHours * deductionRatePerHour;
    let netPay = basePay - salaryDeduction;

    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
