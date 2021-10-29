import React, { Component } from "react";

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf";
import { PDFBarcodeJs } from "../PdfBarcode";
import type { PDFDocumentProxy } from "pdfjs-dist/types/display/api";

interface Props {
  /** See `GlobalWorkerOptionsType`. */
  workerSrc: string;

  url: string;
  beforeLoad: JSX.Element;
  errorMessage?: JSX.Element;
  children: (pdfDocument: PDFDocumentProxy) => JSX.Element;
  onError?: (error: Error) => void;
  onLoad?: (pdfDocument: PDFDocumentProxy) => void;
  cMapUrl?: string;
  cMapPacked?: boolean;
  barcodeProps?: { decodeConfig: any; callback: (result: any) => any };
}

interface State {
  pdfDocument: PDFDocumentProxy | null;
  error: Error | null;
}

export class PdfLoader extends Component<Props, State> {
  state: State = {
    pdfDocument: null,
    error: null,
  };

  static defaultProps = {
    workerSrc: "https://unpkg.com/pdfjs-dist@2.8.335/build/pdf.worker.min.js",
  };

  documentRef = React.createRef<HTMLElement>();

  componentDidMount() {
    this.load();
  }

  componentWillUnmount() {
    const { pdfDocument: discardedDocument } = this.state;
    if (discardedDocument) {
      discardedDocument.destroy();
    }
  }

  componentDidUpdate({ url }: Props) {
    if (this.props.url !== url) {
      this.load();
    }
  }

  componentDidCatch(error: Error, info?: any) {
    const { onError } = this.props;

    if (onError) {
      onError(error);
    }

    this.setState({ pdfDocument: null, error });
  }

  load() {
    const { ownerDocument = document } = this.documentRef.current || {};
    const { url, cMapUrl, cMapPacked, workerSrc } = this.props;
    const { pdfDocument: discardedDocument } = this.state;
    this.setState({ pdfDocument: null, error: null });

    if (typeof workerSrc === "string") {
      GlobalWorkerOptions.workerSrc = workerSrc;
    }

    Promise.resolve()
      .then(() => discardedDocument && discardedDocument.destroy())
      .then(() => {
        if (!url) {
          return;
        }

        return getDocument({
          ...this.props,
          ownerDocument,
          cMapUrl,
          cMapPacked,
        }).promise.then((pdfDocument) => {
          if (this.props.onLoad) {
            this.props.onLoad(pdfDocument);
            if (this.props.barcodeProps) {
              PDFBarcodeJs.decodeDocument(
                pdfDocument,
                this.props.barcodeProps.decodeConfig,
                this.props.barcodeProps.callback
              );
            }
          }
          this.setState({ pdfDocument });
        });
      })
      .catch((e) => this.componentDidCatch(e));
  }

  render() {
    const { children, beforeLoad } = this.props;
    const { pdfDocument, error } = this.state;
    return (
      <>
        <span ref={this.documentRef} />
        {error
          ? this.renderError()
          : !pdfDocument || !children
          ? beforeLoad
          : children(pdfDocument)}
      </>
    );
  }

  renderError() {
    const { errorMessage } = this.props;
    if (errorMessage) {
      return React.cloneElement(errorMessage, { error: this.state.error });
    }

    return null;
  }
}

export default PdfLoader;
