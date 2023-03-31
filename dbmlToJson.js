var XLSX = require("xlsx");
const fs = require("fs");
const { Parser } = require('@dbml/core');
dataJson = {};
sampleData = [];
sheetNames = [];
fields = []
data_sw = [];
let ws;

fs.readFile("database.dbml", "utf8", (error, data) => {
    if (error) {
        console.log(error);
        return;
    } else {
        //parsing the dbml file to json format
        dataJson = Parser.parseDBMLToJSON(data);

        const wb = XLSX.utils.book_new();

        // Parsing the tables names and the fields 
        Object.keys(dataJson.tables).forEach(function (key, index1) {
            sheetNames.push(dataJson.tables[key].name);
            fields.push(dataJson.tables[key].fields)

        });

        //changing any user table to test table because devfacory already has a user table so it's not allowed to have two tables
        // with the same name
        for (let j = 0; j < sheetNames.length; j++) {
            if (sheetNames[j] == "User") {
                sheetNames[j] = "Test";
            }
        }

        //parsing the each field and it's correspending type
        fields.forEach((element, index2) => {
            element.forEach((ele, index) => {
                if (ele.type['type_name'] == 'String') {
                    ele.type['type_name'] = "text"
                    data_sw.push([ele.name, ele.type['type_name']]);
                } else {
                    data_sw.push([ele.name, ele.type['type_name']]);
                }
            })

            ws = XLSX.WorkSheet = XLSX.utils.json_to_sheet(data_sw);
            data_sw = [];
            XLSX.utils.book_append_sheet(wb, ws, sheetNames[index2]);
        });

        // Save the created xlsx file
        XLSX.writeFile(wb, "prisma-schema.xlsx");
        var OUTFILE = "prisma-schema.xlsx";
        deleteFirstRowOfExcelSheets(OUTFILE)
        console.log("Results written to " + OUTFILE);
    }
});

// the purpose of this function is to delete the first row and decremet the rest of the rows by 1
function deleteFirstRowOfExcelSheets(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    sheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        range.s.r += 1;
        worksheet['!ref'] = XLSX.utils.encode_range(range);

        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = worksheet[cellRef];
                if (cell && cell.t !== 'z') { // skip cells with type `z`, which are placeholders
                    const newRef = XLSX.utils.encode_cell({ r: R - 1, c: C });
                    delete worksheet[cellRef];
                    cell.r = R - 1;
                    worksheet[newRef] = cell;
                }
            }
        }
        // update sheet range to exclude first row
        worksheet['!ref'] = XLSX.utils.encode_range({
            s: { r: range.s.r - 1, c: range.s.c },
            e: { r: range.e.r - 1, c: range.e.c }
        });

    });
    XLSX.writeFile(workbook, filePath);
}

