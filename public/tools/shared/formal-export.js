/**
 * CyberScryb Formal Document Export Engine
 * Generates formatted Microsoft Word (.doc) files and print-ready PDFs
 * with standard legal 1-inch margins, formal typography, and proof of service blocks.
 */
(function (global) {
  'use strict';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function textToHtmlParagraphs(text) {
    if (!text) return '';
    var paragraphs = text.split(/\r?\n\r?\n/);
    return paragraphs.map(function (p) {
      var lines = p.split(/\r?\n/).map(escapeHtml).join('<br>\n');
      return '<p style="margin:0 0 14pt 0; text-align:justify;">' + lines + '</p>';
    }).join('\n');
  }

  /**
   * Generates and downloads a formatted Microsoft Word document (.doc)
   */
  function exportWordDoc(text, filename, docTitle) {
    if (!text || text.trim() === '') {
      if (global.LifeTool) global.LifeTool.toast('Generate a document first');
      else alert('Generate a document first.');
      return;
    }

    var title = docTitle || 'Formal Communication';
    var safeFilename = (filename || 'formal-document') + '-' + new Date().toISOString().slice(0, 10) + '.doc';

    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
      'xmlns="http://www.w3.org/TR/REC-html40">\n' +
      '<head>\n' +
      '<meta charset="utf-8">\n' +
      '<title>' + escapeHtml(title) + '</title>\n' +
      '<!--[if gte mso 9]>\n' +
      '<xml>\n' +
      '<w:WordDocument>\n' +
      '<w:View>Print</w:View>\n' +
      '<w:Zoom>100</w:Zoom>\n' +
      '<w:DoNotOptimizeForBrowser/>\n' +
      '</w:WordDocument>\n' +
      '</xml>\n' +
      '<![endif]-->\n' +
      '<style>\n' +
      '@page Section1 {\n' +
      '  size: 8.5in 11.0in;\n' +
      '  margin: 1.0in 1.0in 1.0in 1.0in;\n' +
      '  mso-header-margin: 0.5in;\n' +
      '  mso-footer-margin: 0.5in;\n' +
      '  mso-paper-source: 0;\n' +
      '}\n' +
      'div.Section1 { page: Section1; }\n' +
      'body {\n' +
      '  font-family: "Times New Roman", Times, Georgia, serif;\n' +
      '  font-size: 12pt;\n' +
      '  line-height: 1.5;\n' +
      '  color: #000000;\n' +
      '}\n' +
      'p {\n' +
      '  margin: 0 0 12pt 0;\n' +
      '  line-height: 1.5;\n' +
      '}\n' +
      '.cert-block {\n' +
      '  margin-top: 24pt;\n' +
      '  padding-top: 12pt;\n' +
      '  border-top: 1pt solid #999;\n' +
      '  font-size: 10pt;\n' +
      '  color: #333;\n' +
      '}\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="Section1">\n' +
      textToHtmlParagraphs(text) +
      '\n<div class="cert-block">\n' +
      '<p><strong>CERTIFICATE OF TRANSMISSION / PROOF OF SERVICE</strong></p>\n' +
      '<p>I hereby certify that on this date, a true and correct copy of the foregoing document was delivered via ( ) Certified Mail, Return Receipt Requested ( ) Hand Delivery ( ) Electronic Mail to the designated recipient.</p>\n' +
      '<p>Date: ____________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Signature: ____________________________________</p>\n' +
      '</div>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';

    var blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);

    if (global.LifeTool) global.LifeTool.toast('Downloaded Word Document (.doc)');
  }

  /**
   * Triggers clean print / PDF save
   */
  function exportPDF() {
    var out = document.getElementById('output-text');
    if (!out || out.innerText.trim() === '' || out.querySelector('.placeholder')) {
      if (global.LifeTool) global.LifeTool.toast('Generate a letter first, then print');
      else alert('Generate a letter first, then print.');
      return;
    }
    window.print();
  }

  global.FormalExport = {
    exportWordDoc: exportWordDoc,
    exportPDF: exportPDF
  };

  // Wire into global printLetter if not already defined
  if (!global.printLetter) {
    global.printLetter = exportPDF;
  }
})(window);
