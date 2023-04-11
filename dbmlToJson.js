var XLSX = require("xlsx");
const fs = require("fs");
const { Parser } = require('@dbml/core');

//vars
let dataJson = {};
let sheetNames = [];
let fields = [];
let workingSheetData = [];
let relations = [];
let relationsDataSet = [];
let newRows = [];
let ws;
const ManyToOne='many-to-one';
const OneToMany='one-to-many';

fs.readFile("database.dbml", "utf8", (error, data) => {
    if (error) {
        console.log(error);
        return;
    } else {
        try {
                  //parsing the dbml file to json format
        dataJson = Parser.parseDBMLToJSON(data);

        const wb = XLSX.utils.book_new();
        // Parsing the tables names and fields (fieldName , fieldType) 
        Object.keys(dataJson.tables).forEach(function (key, index1) {
            sheetNames.push(dataJson.tables[key].name);
            fields.push(dataJson.tables[key].fields)

        });

        // parsing relations 
        Object.keys(dataJson.refs).forEach(function (key, index1) {
            relations.push(dataJson.refs[key].endpoints);
        });


        // extracting each table with it's related table
        function createTableRelationsArray(tableRelations) {
            try {
                const tableRelationObjects = [];
                tableRelations.forEach((relation) => {
                    const primaryTable = {
                        schemaName: relation[0].schemaName,
                        tableName: relation[0].tableName,
                        fieldNames: relation[0].fieldNames[0],
                        schemaName2: relation[1].schemaName,
                        tableName2: relation[1].tableName,
                        fieldNames2: relation[1].fieldNames[0],
                    };
    
                    relationsDataSet.push(
                        {
                            'PrimaryTable': relation[0].tableName,
                            'SecondaryTable': relation[1].tableName,
                            "field": relation[1].fieldNames[0],
                            "relation": relation[0].relation[0] === "1" ? OneToMany : ManyToOne
                        }
                    )
                    const relationType = relation[0].relation === "1" ? OneToMany : ManyToOne;
    
                    tableRelationObjects.push({
                        primaryTable,
                        relationType,
                    });
                });
                return tableRelationObjects;
            } catch (error) {
                return error.message
            }
          
        }

        createTableRelationsArray(relations);

        /// Create an empty object to store the tables
        const tab = {};

        // Loop through the array of objects
        for (const obj of relationsDataSet) {
            try {
                            // Check if the primary table is already in the tab object
            if (!tab[obj.PrimaryTable]) {
                // If not, create a new object for the primary table
                tab[obj.PrimaryTable] = {
                    name: 'tab',
                    tableName: obj.PrimaryTable,
                    fields: [],
                    relations: []
                };
            }

            // Check if the secondary table is already in the tab object
            if (!tab[obj.SecondaryTable]) {
                // If not, create a new object for the secondary table
                tab[obj.SecondaryTable] = {
                    name: 'tab',
                    tableName: obj.SecondaryTable,
                    fields: [],
                    relations: []
                };
            }

            // Add the field to the primary table object
            tab[obj.PrimaryTable].fields.push(obj.field);

            // Determine the type of relationship
            if (obj.relation === 'one-to-many') {
                // If it's a one-to-many relationship, add it to the primary table object
                tab[obj.PrimaryTable].relations.push({
                    type: 'one-to-many',
                    table: 'tab',
                    tableName: obj.SecondaryTable,
                    field: obj.field
                });
            } else {
                // If it's a many-to-one relationship, add it to the secondary table object
                tab[obj.SecondaryTable].relations.push({
                    type: 'many-to-one',
                    table: 'tab',
                    tableName: obj.PrimaryTable,
                    field: obj.field
                });
            }
            } catch (error) {
                return error;
            }

        }

        //parsing the each field and it's correspending type
        fields.forEach((element, index2) => {
            try {
                element.forEach((ele, index) => {
                    if (ele.type['type_name'] == 'String') {
                        ele.type['type_name'] = "text";
                        workingSheetData.push([ele.name, ele.type['type_name']]);
                    } else {
                        workingSheetData.push([ele.name, ele.type['type_name']]);
                    }
                })
    
                ws = XLSX.WorkSheet = XLSX.utils.json_to_sheet(workingSheetData);
                workingSheetData = [];
                XLSX.utils.book_append_sheet(wb, ws, sheetNames[index2]);  
            } catch (error) {
                return error
            }
        
        });

        // Save the created xlsx file
        XLSX.writeFile(wb, "prisma-schema.xlsx");
        var OUTFILE = "prisma-schema.xlsx";
        deleteFirstRowOfExcelSheets(OUTFILE);
        console.log("Results written to " + OUTFILE);
        } catch (error) {
            return error
        }
  
    }
});

// the purpose of this function is to delete the first row and decremet the rest of the rows by 1
function deleteFirstRowOfExcelSheets(filePath) {
    try {
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
                    // console.log(cell.v)
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
    
        // Get the first sheet of the workbook
        sheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
    
            // Get the range of the worksheet
            const range = XLSX.utils.decode_range(worksheet['!ref']);
    
            // Get the last row index
            const lastRowIndex = range.e.r;
    
            // Increment the last row index by 1 to get the row where you want to insert the new rows
            const newRowStartIndex = lastRowIndex + 1;
            for (let index = 0; index < relationsDataSet.length; index++) {
                const element = relationsDataSet[index];
                if (sheetName == element.PrimaryTable) {
                    // Create an array of arrays, where each inner array contains the values you want to insert in the cells of the new rows
                    newRows.push([
                        element.SecondaryTable.replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); }),
                        element.SecondaryTable.replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); })
                    ],)
                }
    
            }
            // Add the new rows to the worksheet
            XLSX.utils.sheet_add_aoa(worksheet, newRows, { origin: `${newRowStartIndex}:A` });
        })
    
        sheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
            const filteredData = data.filter(row => {
                return !(
                    row.includes("createdAt") ||
                    row.includes("deletedAt") ||
                    row.includes("id") ||
                    row.includes("updatedAt") || 
                    row.includes("Id"));
            });
            const newWorksheet = XLSX.utils.json_to_sheet(filteredData);
            workbook.Sheets[sheetName] = newWorksheet;
        });
    
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
    } catch (error) {
        return error;
    }

}


