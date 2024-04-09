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

import { ICommandPalette } from '@jupyterlab/apputils';

import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';




/**
 * Initialization data for the myextension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'html-toc-export:plugin',
  description: 'A JupyterLab extension.',
  autoStart: true,
  requires: [ICommandPalette, INotebookTracker, ITableOfContentsTracker],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    tracker: INotebookTracker,
    toc: ITableOfContentsTracker,
  ) => {
    console.log('JupyterLab extension myextension is activated!');
    console.log('ICommandPalette:', palette);


    const command: string = 'toc:export';
    app.commands.addCommand( command, {
      label: 'Export HTML w/ ToC',
      execute: () => {
        let current = getCurrent(tracker, app.shell);
        getHTML(current.context.path)
          .then((response) => {
            let toc_model = toc.get(current)!;
            let domParser = new DOMParser();
            let doc = domParser.parseFromString(response, "text/html");
            let toc_html = doc.createElement("div");
            toc_html.innerHTML = generateToCHTML(toc_model);
            doc.body.prepend(toc_html);
            getCSS()
            .then((response) => {
              let css_node = doc.createElement("style");
              css_node.innerHTML = response;
              doc.head.appendChild(css_node);
              downloadHtmlDocument(doc, "test.html");
            })
            .catch((error) => {
              console.error('Error:', error);
            });
          });
      }
    });
    palette.addItem({ command, category: 'Tutorial'});
  }
};

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

function getCurrent(
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

async function getCSS(): Promise<string>{
  const settings = ServerConnection.makeSettings();
  let response: Response;
  let baseUrl = PageConfig.getBaseUrl();
  let url = URLExt.join(baseUrl, "html-toc-export", "toc-css");
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

export default plugin;
