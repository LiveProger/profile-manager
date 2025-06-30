import { toast } from "react-toastify";

const toastPromise = (promiseFunction, loadingMessage, success, error) => {
  if (promiseFunction) {
    return toast.promise(promiseFunction, {
      pending: loadingMessage || "Загрузка...",
      success: success || "Операция выполнена успешно",
      error: error || "Произошла ошибка",
      autoClose: 4000,
    });
  }
};

export default toastPromise;
