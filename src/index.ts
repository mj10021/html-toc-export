import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';

/**
 * Initialization data for the html-toc-export extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'html-toc-export:plugin',
  description: 'Export HTML with table of contents',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension html-toc-export is activated!');

    requestAPI<any>('get-example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The html_toc_export server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
