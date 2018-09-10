import { ResponseMessage, RequestMessage } from "./dapps/Interfaces";

export class ServiceWrapper<TService> {
  _service: TService;
  _responseSuffix: string;
  sendResponse: (response: ResponseMessage) => void;

  constructor(
    service: TService,
    sendResponse: (response: ResponseMessage) => void
  ) {
    this._service = service;
    this.onRequest = this.onRequest.bind(this);
    this.sendResponse = this.sendResponse.bind(this);
  }

  async onRequest(message: RequestMessage): Promise<any> {
    const { method, params, id } = message;

    const func = this._service[method];
    let data;
    const response: ResponseMessage = {
      id,
      error: null,
      result: null
    };
    if (method.substring(0, 1) === "_") {
      response.error = {
        status: "ERROR",
        message: "Cannot call private function"
      };
    }

    if (typeof func !== "function") {
      response.error = {
        status: "ERROR",
        mesage: `No function ${event} in ${this._service.constructor.name}`
      };
    }
    if (!response.error) {
      try {
        response.result = await func.call(this._service, ...params);
      } catch (error) {
        response.error = { status: "ERROR", message: error.message };
      }
    }
    if (response.error) {
      //TODO logiing
    }
    this.sendResponse(response);
  }
}
