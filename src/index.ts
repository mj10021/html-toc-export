import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  INotebookTracker, NotebookPanel
} from '@jupyterlab/notebook';

import {
  ITableOfContentsTracker,
  TableOfContents
} from '@jupyterlab/toc';

import { PageConfig } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Menu } from '@lumino/widgets';

// CSS for export file
const toc_css = `
/*

originally extracted from https://gist.github.com/magican/5574556

Most colors defined here are overridden by javascript which adds css based on
values in the server config file notebook.json, which can be edited directly,
or colors can be selected in the nbextensions_configurator
*/



/*background color for links when you mouse over it */
#toc-wrapper li > span:hover {
    background-color: #DAA520;
  }
  
  #toc a {
    color: #333333;  /* default - alterable via nbextension-configurator */
    text-decoration: none;
  }
  #navigate_menu li > span:hover {background-color: #f1f1f1}
  
  
  /* Move menus and tooolbar to the left, following @Kevin-McIsaac suggestion
  This is now done in javascript, if the relevant option is selected
  div#menubar-container, div#header-container {
  width: auto;
  padding-left: 20px;
  }*/
  
  #navigate_menu {
    list-style-type: none;
    max-width: 800px;
    min-width: 100px;
    width: 250px;
    overflow: auto;
  }
  
  
  #navigate_menu a {
    list-style-type: none;
    color: #333333;    /* default - alterable via nbextension-configurator */
    text-decoration: none;
  }
  
  #navigate_menu li  {
    padding-left: 0px;
    clear: both;
    list-style-type: none;
  }
  
  #navigate_menu > .toc-item,
  #navigate_menu ul {
    padding-left: 0px;
  }
  
  .toc {
    padding: 0px;
    overflow-y: auto;
    font-weight: normal;
    color: #333333;    /* default - alterable via nbextension-configurator */
    white-space: nowrap;
    overflow-x: auto;
  }
  
  .text_cell .toc {
    margin-top: 1em;
  }
  
  .toc ul.toc-item {
      list-style-type: none;
      padding: 0;
      margin:  0;
  }
  
  #toc-wrapper {
    z-index: 90;
    /* position: fixed !important; */
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 10px;
    border-style: solid;
    border-width: thin;
    background-color: #fff;   /* default - alterable via nbextension-configurator */
  }
  
  #toc-wrapper .toc {
    flex-grow: 1;
  }
  
  .float-wrapper {
    border-color: rgba(0, 0, 0, 0.38);
    border-radius: 5px;
    opacity: .8; 
  }
  
  .sidebar-wrapper {
    top: 10px;
    bottom: 0;
    width: 212px;
    border-color: #eeeeee;  /* default - alterable via nbextension-configurator */
  }
  
  .sidebar-wrapper .ui-resizable-se {
    display: none;
  }
  
  .sidebar-wrapper .ui-resizable-e {
    position: absolute;
    top: calc(50% - 8px);
  }
  
  #toc-wrapper.closed {
    min-width: 100px;
    width: auto;
    transition: width;
  }
  #toc-wrapper:hover{
    opacity: 1;
  }
  #toc-wrapper .header {
    font-size: 18px;
    font-weight: bold;
  }
  
  .sidebar-wrapper .hide-btn {
    display:none;
  }
  
  #toc-wrapper .hide-btn:before {
    content: "\f147";
  }
  
  #toc-wrapper.closed .hide-btn:before {
    content: "\f196";
  }
  
  #toc-header .fa {
    font-size: 14px;
    text-decoration: none;
  }
  
  /* on scroll style */
  .highlight_on_scroll {
      border-left: solid 4px blue;
  }
  
  .toc-item li { margin:0; padding:0; color:black }
  .toc-item li > span { display:block }
  .toc-item li > span { padding-left:0em }
  .toc-item li li > span { padding-left:1em }
  .toc-item li li li > span { padding-left:2em }
  .toc-item li li li li > span { padding-left:3em }
  .toc-item li li li li li > span { padding-left:4em }
  .toc-item li li li li li li > span { padding-left:5em }
  
  
  #toc-wrapper .toc-item-num {
      font-family: Georgia, Times New Roman, Times, serif;
      color: black;  /* default - alterable via nbextension-configurator */
  }
  
  /*
  These colors are now specified in js, after reading the extension's config stored in system
  and updated using the nbextension-configurator
  .toc-item-highlight-select  {background-color: Gold}
  .toc-item-highlight-execute  {background-color: red}
  .toc-item-highlight-execute.toc-item-highlight-select   {background-color: Gold} */
  
  #toc-header .fa ,
  .toc-item .fa-fw:first-child {
    cursor: pointer;
  }
  
  #toc-header,
  .modal-header {
    cursor: move;
  }
  
  .tocSkip {
    display: none;
  }
`


function generateToCHTML(model: TableOfContents.IModel<TableOfContents.IHeading>): string {
  // Recursive function to process headings and generate HTML
  function processHeadings(headings: TableOfContents.IHeading[], level: number): string {
      let html = '';
      let index = 0;

      while (index < headings.length) {
          const heading = headings[index];
          if (heading.text.length < 1) {
              index++;
              continue;
          }

          if (heading.level === level) {
              html += `<li class="toc-item"><span><h${level}>${heading.text}</h${level}></span>`;

              // Find and process subheadings
              const subHeadingsStart = index + 1;
              let subHeadingsEnd = headings.findIndex((h, i) => i >= subHeadingsStart && h.level <= level);
              subHeadingsEnd = subHeadingsEnd === -1 ? headings.length : subHeadingsEnd;
              const subHeadings = headings.slice(subHeadingsStart, subHeadingsEnd);

              if (subHeadings.length > 0) {
                  html += `<ul class="toc-sublist toc-level-${level + 1}">${processHeadings(subHeadings, level + 1)}</ul>`;
              }

              html += `</li>`;
              index = subHeadingsEnd;
          } else {
              index++;
          }
      }

      return html;
  }

  return `<div id="toc-wrapper" class="toc-wrapper">
            <div class="toc">
              <ul id="navigate_menu" class="toc toc-level-1">${processHeadings(model.headings, 1)}</ul>
            </div>
          </div>`;
}

  
function downloadHtmlDocument(htmlDocument: Document, filename: string) {
  // Serialize the HTMLDocument to a string
  const serializer = new XMLSerializer();
  const htmlString = serializer.serializeToString(htmlDocument);

  // Create a Blob from the HTML string
  const blob = new Blob([htmlString], { type: 'text/html' });

  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create a temporary link element and trigger the download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'document.html';
  document.body.appendChild(link);
  link.click();

  // Clean up by removing the link element and revoking the Blob URL
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getCurrentPanel(
  tracker: INotebookTracker,
  shell: JupyterFrontEnd.IShell,
): NotebookPanel {
  const widget = tracker.currentWidget;

  if (widget) {
    shell.activateById(widget.id);
  }

  return widget!;
}

async function getHTML(path: string): Promise<string>{
  const settings = ServerConnection.makeSettings();
  let response: Response;
  let url = PageConfig.getNBConvertURL({
    format: 'HTML',
    download: false,
    path,
  });
  try {
    response = await ServerConnection.makeRequest(url, {}, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }
  let data: any = await response.text();
  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }
  return data
}




/**
 * Initialization data for the extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'html-toc-export:plugin',
  description: 'A JupyterLab extension.',
  autoStart: true,
  requires: [INotebookTracker, ITableOfContentsTracker, IMainMenu],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    toc: ITableOfContentsTracker,
    mainMenu: IMainMenu,
  ) => {
    console.log('Export ToC is activated!');
    const command: string = 'toc:export';
    app.commands.addCommand( command, {
      label: 'Export HTML w/ ToC',
      execute: () => {
        let current = getCurrentPanel(tracker, app.shell);
        // Save the doc here to be consistent with "Save and Export Notebook As:"
        const context = current.context;
        if (context.model.dirty && !context.model.readOnly) {
          context.save().then(() => 
          getHTML(current.context.path)
          .then((response) => {
            let toc_model = toc.get(current)!;
            let domParser = new DOMParser();
            let doc = domParser.parseFromString(response, "text/html");
            let toc_html = doc.createElement("div");
            toc_html.innerHTML = generateToCHTML(toc_model);
            doc.body.prepend(toc_html);

            let css_node = doc.createElement("style");
            css_node.innerHTML = toc_css;
            doc.head.appendChild(css_node);
            downloadHtmlDocument(doc, "test.html");
            
            })
          );
        }
        else {
          getHTML(current.context.path)
            .then((response) => {
              let toc_model = toc.get(current)!;
              let domParser = new DOMParser();
              let doc = domParser.parseFromString(response, "text/html");
              let toc_html = doc.createElement("div");
              toc_html.innerHTML = generateToCHTML(toc_model);
              doc.body.prepend(toc_html);

              let css_node = doc.createElement("style");
              css_node.innerHTML = toc_css;
              doc.head.appendChild(css_node);
              downloadHtmlDocument(doc, "test.html");
          
          });
        }
      }
    });

    let exportTo: Menu = mainMenu.fileMenu.items.find(
      item =>
        item.type === 'submenu' &&
        item.submenu!.id === 'jp-mainmenu-file-notebookexport'
    )!.submenu!;
    exportTo.addItem({ command });
  }
};


export default plugin;
