import { Contract } from "ethers";
import { MetaMaskError } from "../toaster";

export function decodeError(contract: Contract, err: MetaMaskError) {
  const errordata = err.error?.data?.data;
  const iface = contract.interface;
  const selecter = errordata.slice(0, 10);
  const res = iface.decodeErrorResult(selecter, errordata);
  const errorfragments = iface.getError(selecter);

  let message = "";
  if (errorfragments.inputs.length > 0) {
    message += "[ ";
    message = errorfragments.inputs
      .map((input, index) => {
        return `${input.name}: ${res[index].toString()}`;
      })
      .join(", ");
    message += " ]";
  }

  return {
    errorname: errorfragments.name,
    message: message,
  };
}
