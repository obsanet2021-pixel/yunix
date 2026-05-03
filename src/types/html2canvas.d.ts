declare module 'html2canvas' {
  interface Html2CanvasOptions {
    backgroundColor?: string | null;
    scale?: number;
    logging?: boolean;
    useCORS?: boolean;
    allowTaint?: boolean;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    foreignObjectRendering?: boolean;
    imageTimeout?: number;
    onclone?: (doc: Document) => void;
    removeContainer?: boolean;
  }

  function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions
  ): Promise<HTMLCanvasElement>;

  export = html2canvas;
  export default html2canvas;
}
