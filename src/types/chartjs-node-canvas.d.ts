declare module 'chartjs-node-canvas' {
  import { ChartConfiguration } from 'chart.js';

  export interface ChartJSNodeCanvasOptions {
    width: number;
    height: number;
    chartCallback?: (chartJS: any) => void;
  }

  export class ChartJSNodeCanvas {
    constructor(options: ChartJSNodeCanvasOptions);
    renderToBuffer(configuration: ChartConfiguration): Promise<Buffer>;
  }
} 