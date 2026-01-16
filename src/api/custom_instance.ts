import type { AxiosError } from "axios";
import Axios, { type AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config";

export const AXIOS_INSTANCE = Axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds - allows slow backend operations to complete
});

// Debug interceptor - log all requests
AXIOS_INSTANCE.interceptors.request.use((config) => {
  console.log(
    `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${
      config.url
    }`,
    config.params || ""
  );
  return config;
});

// Debug interceptor - log all responses/errors
AXIOS_INSTANCE.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} - ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(
      `[API Error] ${error.config?.url}:`,
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

// add a second `options` argument here if you want to pass extra options to each generated query
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => {
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
  }).then(({ data }) => data);

  return promise;
};

// In some case with react-query and swr you want to be able to override the return error type so you can also do it here like this
export type ErrorType<Error> = AxiosError<Error>;

export type BodyType<BodyData> = BodyData;
