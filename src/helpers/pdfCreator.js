const { PDFDocument, StandardFonts, drawTextField, doc } = require('pdf-lib');
const { readFileSync } = require("fs");

module.exports = async function generateCertificatePdf (nameString, author, day, year, courseName) {
    const existingPdfBytes = readFileSync('./src/helpers/fillable.pdf');
    const normalizedNameString = correctPolishLetters(nameString) 
    const pdfDoc = await PDFDocument.load(existingPdfBytes);    
    const form = pdfDoc.getForm()

    const nameField = form.getTextField('text_name');
    const courseNameField = form.getTextField('text_courseName');
    const dateField = form.getTextField('text_date');
    const today = new Date().getMonth() + '/' + new Date().getFullYear(); 
    let tmp_author = 'RICG'
    nameField.setText(correctPolishLetters(normalizedNameString));
    courseNameField.setText(correctPolishLetters(courseName));
    dateField.setText(today + ' ' + correctPolishLetters(tmp_author))

    form.flatten()

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');

}

function correctPolishLetters(inputString) {
    // mapping for characters
    const mapping = {
      ą: "a",
      ć: "c",
      ę: "e",
      ł: "l",
      ń: "n",
      ó: "o",
      ś: "s",
      ź: "z",
      ż: "z",
    };
  
    // variable to save result
    let withoutDiacritics = "";
  
    // loop over every number
    for (const char of inputString) {
      // check if mapping has a key with the current character
      if (Object.keys(mapping).includes(char)) {
        withoutDiacritics += mapping[char];
        // if yes, return its replacement
      } else {
        // if not, return it unchanged
        withoutDiacritics += char;
      }
    }
  
    // return result
    return withoutDiacritics;
  }