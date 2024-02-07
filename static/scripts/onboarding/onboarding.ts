import _sodium from "libsodium-wrappers";
import { Octokit } from "@octokit/rest";
import { createOrUpdateTextFile } from "@octokit/plugin-create-or-update-text-file";
import YAML from "yaml";
import { ethers } from "ethers";
import { PERMIT2_ADDRESS } from "@uniswap/permit2-sdk";
import { JsonRpcSigner, Network } from "@ethersproject/providers";
import { parseUnits } from "ethers/lib/utils";
import { NetworkIds, Tokens, getNetworkName, networkNames } from "../rewards/constants";
import { erc20Abi } from "../rewards/abis/erc20Abi";

const classes = ["error", "warn", "success"];
const inputClasses = ["input-warn", "input-error", "input-success"];
const outKey = document.getElementById("outKey") as HTMLInputElement;
const githubPAT = document.getElementById("githubPat") as HTMLInputElement;
const orgName = document.getElementById("orgName") as HTMLInputElement;
const walletPrivateKey = document.getElementById("walletPrivateKey") as HTMLInputElement;
const safeAddressInput = document.getElementById("safeAddress") as HTMLInputElement;
const setBtn = document.getElementById("setBtn") as HTMLButtonElement;
const allowanceInput = document.getElementById("allowance") as HTMLInputElement;
const chainIdSelect = document.getElementById("chainId") as HTMLSelectElement;
const loader = document.querySelector(".loader-wrap") as HTMLElement;

const APP_ID = 236521;
const DEFAULT_ORG = "ubiquity";
const REPO_NAME = "ubiquibot-config";
const DEFAULT_REPO = "ubiquibot";
const KEY_PATH = ".github/ubiquibot-config.yml";
const DEFAULT_PATH = "ubiquibot-config-default.json";
const KEY_NAME = "private-key-encrypted";
const KEY_PREFIX = "HSK_";
const X25519_KEY = "5ghIlfGjz_ChcYlBDOG7dzmgAgBPuTahpvTMBipSH00";

let encryptedValue = "";

interface ConfLabel {
  name: string;
}

interface CommandLabel {
  name: string;
  enabled: boolean;
}

interface IIncentive {
  comment: {
    elements: Record<string, unknown>;
    totals: {
      word: number;
    };
  };
}

interface IControl {
  label: boolean;
  organization: boolean;
}

interface IConf {
  "private-key-encrypted"?: string;
  "safe-address"?: string;
  "base-multiplier"?: number;
  "auto-pay-mode"?: boolean;
  "analytics-mode"?: boolean;
  "max-concurrent-bounties"?: number;
  "incentive-mode"?: boolean;
  "evm-network-id"?: number;
  "price-multiplier"?: number;
  "issue-creator-multiplier"?: number;
  "payment-permit-max-price"?: number;
  "max-concurrent-assigns"?: number;
  "assistive-pricing"?: boolean;
  "disable-analytics"?: boolean;
  "comment-incentives"?: boolean;
  "register-wallet-with-verification"?: boolean;
  "promotion-comment"?: string;
  "default-labels"?: string[];
  "time-labels"?: ConfLabel[];
  "priority-labels"?: ConfLabel[];
  "command-settings"?: CommandLabel[];
  incentives?: IIncentive;
  "enable-access-control"?: IControl;
}

let defaultConf: IConf = {
  "private-key-encrypted": "",
  "safe-address": "",
  "base-multiplier": 1,
  "auto-pay-mode": false,
  "analytics-mode": false,
  "max-concurrent-bounties": 1,
  "incentive-mode": false,
  "evm-network-id": 1,
  "price-multiplier": 1,
  "issue-creator-multiplier": 1,
  "payment-permit-max-price": 1,
  "max-concurrent-assigns": 1,
  "assistive-pricing": false,
  "disable-analytics": false,
  "comment-incentives": false,
  "register-wallet-with-verification": false,
  "promotion-comment": "",
  "default-labels": [],
  "time-labels": [],
  "priority-labels": [],
  "command-settings": [],
  incentives: {
    comment: {
      elements: {},
      totals: {
        word: 0,
      },
    },
  },
  "enable-access-control": {
    label: false,
    organization: true,
  },
};

export const parseYAML = async (data: any): Promise<any | undefined> => {
  try {
    const parsedData = await YAML.parse(data);
    if (parsedData !== null) {
      return parsedData;
    } else {
      return undefined;
    }
  } catch (error) {
    return undefined;
  }
};

export const parseJSON = async (data: any): Promise<any | undefined> => {
  try {
    const parsedData = await JSON.parse(data);
    return parsedData;
  } catch (error) {
    return undefined;
  }
};

export const YAMLStringify = (value: any) => YAML.stringify(value, { defaultKeyType: "PLAIN", defaultStringType: "QUOTE_DOUBLE", lineWidth: 0 });

export const getConf = async (initial: boolean = false): Promise<string | undefined> => {
  try {
    const octokit = new Octokit({ auth: githubPAT.value });
    const { data } = await octokit.rest.repos.getContent({
      owner: initial ? DEFAULT_ORG : orgName.value,
      repo: initial ? DEFAULT_REPO : REPO_NAME,
      path: initial ? DEFAULT_PATH : KEY_PATH,
      mediaType: {
        format: "raw",
      },
    });
    return data as unknown as string;
  } catch (error: any) {
    return undefined;
  }
};

const getTextBox = (text: string) => {
  const strLen = text.split("\n").length * 22;
  const strPx = `${strLen > 140 ? strLen : 140}px`;
  return strPx;
};

const resetToggle = () => {
  (walletPrivateKey.parentNode?.querySelector(".status-log") as HTMLElement).innerHTML = "";
  (githubPAT.parentNode?.querySelector(".status-log") as HTMLElement).innerHTML = "";
  (orgName.parentNode?.querySelector(".status-log") as HTMLElement).innerHTML = "";
};

const classListToggle = (targetElem: HTMLElement, target: "error" | "warn" | "success", inputElem?: HTMLInputElement | HTMLTextAreaElement) => {
  classes.forEach(className => targetElem.classList.remove(className));
  targetElem.classList.add(target);

  if (inputElem) {
    inputClasses.forEach(className => inputElem.classList.remove(className));
    inputElem.classList.add(`input-${target}`);
  }
};

const statusToggle = (type: "error" | "warn" | "success", message: string) => {
  resetToggle();
  const statusKey = document.getElementById("statusKey") as HTMLInputElement;
  classListToggle(statusKey, type);
  statusKey.value = message;
};

const focusToggle = (targetElem: HTMLInputElement | HTMLTextAreaElement, type: "error" | "warn" | "success", message: string) => {
  resetToggle();
  const infoElem = targetElem.parentNode?.querySelector(".status-log") as HTMLElement;
  infoElem.innerHTML = message;
  classListToggle(infoElem, type, targetElem);
  targetElem.focus();
};

const toggleLoader = (state: "start" | "end") => {
  if (state === "start") {
    setBtn.disabled = true;
    loader.style.display = "flex";
  } else {
    setBtn.disabled = false;
    loader.style.display = "none";
  }
};

const singleToggle = (type: "error" | "warn" | "success", message: string, focusElem?: HTMLInputElement | HTMLTextAreaElement) => {
  statusToggle(type, message);

  if (focusElem) {
    focusToggle(focusElem, type, message);
  }

  toggleLoader("end");
};

const sodiumEncryptedSeal = async (publicKey: string, secret: string) => {
  outKey.value = "";
  encryptedValue = "";
  try {
    await _sodium.ready;
    const sodium = _sodium;

    const binkey = sodium.from_base64(publicKey, sodium.base64_variants.URLSAFE_NO_PADDING);
    const binsec = sodium.from_string(secret);
    const encBytes = sodium.crypto_box_seal(binsec, binkey);
    const output = sodium.to_base64(encBytes, sodium.base64_variants.URLSAFE_NO_PADDING);
    defaultConf[KEY_NAME] = output;
    defaultConf["evm-network-id"] = Number(chainIdSelect.value);
    defaultConf["safe-address"] = safeAddressInput.value;
    outKey.value = YAMLStringify(defaultConf);
    outKey.style.height = getTextBox(outKey.value);
    encryptedValue = output;
    singleToggle("success", `Success: Key Encryption is ok.`);
  } catch (error: any) {
    singleToggle("error", `Error: ${error.message}`);
  }
};

const setConfig = async () => {
  try {
    toggleLoader("start");
    const pluginKit = Octokit.plugin(createOrUpdateTextFile);
    const octokit = new pluginKit({ auth: githubPAT.value });
    const { data: userInfo } = await octokit.rest.users.getByUsername({
      username: orgName.value,
    });
    if (userInfo.type === "Organization") {
      let repository_id: number | null = null;
      try {
        const { data: repository_info } = await octokit.rest.repos.get({
          owner: orgName.value,
          repo: REPO_NAME,
        });
        repository_id = repository_info.id;
      } catch (error) {
        if (!(error instanceof Error)) {
          return console.error(error);
        }

        console.error(error.message);
        try {
          const { data: repo_res } = await octokit.rest.repos.createInOrg({
            org: orgName.value,
            name: REPO_NAME,
            auto_init: true,
            private: true,
            visibility: "private",
            has_downloads: true,
          });
          repository_id = repo_res.id;
        } catch (error) {
          if (!(error instanceof Error)) {
            return console.error(error);
          }
          console.error(error.message);
          singleToggle("error", `Error: Repo initialization failed, try again later.`);
          return;
        }
      }

      const { data: appInstallations } = await octokit.rest.orgs.listAppInstallations({
        org: orgName.value,
        per_page: 100,
      });
      const ins = appInstallations.installations.filter(installation => installation.app_id === APP_ID);

      if (ins.length > 0) {
        const installation_id = ins[0].id;
        const { data: installed_repos } = await octokit.rest.apps.listInstallationReposForAuthenticatedUser({
          installation_id: installation_id,
        });
        const irs = installed_repos.repositories.filter(installed_repo => installed_repo.id === repository_id);

        if (irs.length === 0) {
          await octokit.rest.apps.addRepoToInstallationForAuthenticatedUser({
            installation_id: installation_id,
            repository_id: repository_id,
          });
        }

        const conf = await getConf();

        const updatedConf = defaultConf;
        const parsedConf: IConf | undefined = await parseYAML(conf);
        updatedConf[KEY_NAME] = encryptedValue;
        updatedConf["evm-network-id"] = Number(chainIdSelect.value);
        updatedConf["safe-address"] = safeAddressInput.value;

        // combine configs (default + remote org wide)
        const combinedConf = Object.assign(updatedConf, parsedConf);

        const stringified = YAMLStringify(combinedConf);
        outKey.value = stringified;
        const { updated } = await octokit.createOrUpdateTextFile({
          owner: orgName.value,
          repo: REPO_NAME,
          path: KEY_PATH,
          content: stringified,
          message: `${crypto.randomUUID()}`,
        });

        if (updated) {
          singleToggle("success", `Success: private key is updated.`);
        } else {
          singleToggle("success", `Success: private key is upto date.`);
        }

        await nextStep();
      } else {
        singleToggle("warn", `Warn: Please install the app first.`);
      }
    } else {
      singleToggle("error", `Error: Not an organization.`, orgName);
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      return console.error(error);
    }
    console.error(error);
    singleToggle("error", `Error: ${error.message}`);
  }
};

const setInputListeners = () => {
  const inputs = document.querySelectorAll("input") as NodeListOf<HTMLInputElement>;

  inputs.forEach(input => {
    input.addEventListener("input", e => {
      inputClasses.forEach(className => (e.target as HTMLInputElement).classList.remove(className));
      (((e.target as HTMLInputElement).parentNode as HTMLElement).querySelector(".status-log") as HTMLElement).innerHTML = "";
    });
  });
};

let currentStep = 1;
let signer: JsonRpcSigner | undefined = undefined;

const nextStep = async () => {
  const configChainId = Number(chainIdSelect.value);

  const tokenNameSpan = document.getElementById("allowance + span");
  if (tokenNameSpan) {
    if (configChainId === NetworkIds.Mainnet) {
      tokenNameSpan.innerHTML = "DAI";
    } else if (configChainId === NetworkIds.Gnosis) {
      tokenNameSpan.innerHTML = "WXDAI";
    }
  }

  const step1 = document.getElementById("step1") as HTMLElement;
  step1.classList.add("hidden");
  const step2 = document.getElementById("step2") as HTMLElement;
  step2.classList.remove("hidden");
  const stepper = document.getElementById("stepper") as HTMLElement;
  const steps = stepper.querySelectorAll("div.step");
  steps[0].classList.remove("active");
  steps[1].classList.add("active");
  setBtn.innerText = "Approve";
  currentStep = 2;

  if (!window.ethereum) {
    singleToggle("error", `Error: Please install MetaMask or any other Ethereum wallet.`);
    return;
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = await connectWallet();
  if (!signer) {
    singleToggle("error", `Error: Please connect to MetaMask.`);
    return;
  }

  const currentChainId = await signer.getChainId();

  if (configChainId !== currentChainId) {
    singleToggle("error", `Error: Please connect to ${getNetworkName(configChainId)}.`);
    if (await switchNetwork(provider, configChainId)) {
      singleToggle("success", ``);
    }
  }

  // watch for chain changes
  window.ethereum.on("chainChanged", async (currentChainId: string) => {
    if (configChainId === parseInt(currentChainId, 16)) {
      singleToggle("success", ``);
    } else {
      singleToggle("error", `Error: Please connect to ${getNetworkName(configChainId)}.`);
      switchNetwork(provider, configChainId);
    }
  });
};

const connectWallet = async (): Promise<JsonRpcSigner | undefined> => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    return signer;
  } catch (error: any) {
    if (error?.message?.includes("missing provider")) {
      singleToggle("error", "Error: Please install MetaMask.");
    } else {
      singleToggle("error", "Error: Please connect your wallet.");
    }
    return undefined;
  }
};

const switchNetwork = async (provider: ethers.providers.Web3Provider, chainId: string | number): Promise<boolean> => {
  try {
    // if chainId is a number then convert it to hex
    if (typeof chainId === "number") {
      chainId = `0x${chainId.toString(16)}`;
    }
    // if chainId is a string but doesn't start with 0x then convert it to hex
    if (typeof chainId === "string" && !chainId.startsWith("0x")) {
      chainId = `0x${Number(chainId).toString(16)}`;
    }
    await provider.send("wallet_switchEthereumChain", [{ chainId: chainId }]);
    return true;
  } catch (error: any) {
    return false;
  }
};

const isHex = (str: string): boolean => {
  const regexp = /^[0-9a-fA-F]+$/;
  return regexp.test(str);
};

const step1Handler = async () => {
  if (walletPrivateKey.value === "") {
    singleToggle("warn", `Warn: Private_Key is not set.`, walletPrivateKey);
    return;
  }
  if (!isHex(walletPrivateKey.value)) {
    singleToggle("warn", `Warn: Private_Key is not a valid hex string.`, walletPrivateKey);
    return;
  }
  if (walletPrivateKey.value.length !== 64) {
    singleToggle("warn", `Warn: Private_Key must be 32 bytes long.`, walletPrivateKey);
    return;
  }
  if (orgName.value === "") {
    singleToggle("warn", `Warn: Org Name is not set.`, orgName);
    return;
  }
  if (githubPAT.value === "") {
    singleToggle("warn", `Warn: GitHub PAT is not set.`, githubPAT);
    return;
  }
  if (!safeAddressInput.value.startsWith("0x")) {
    singleToggle("warn", `Warn: Safe Address must start with 0x.`, safeAddressInput);
    return;
  }
  if (!isHex(safeAddressInput.value.substring(2))) {
    singleToggle("warn", `Warn: Safe Address is not a valid hex string.`, safeAddressInput);
    return;
  }
  if (safeAddressInput.value.length !== 42) {
    singleToggle("warn", `Warn: Safe Address must be 20 bytes long.`, safeAddressInput);
    return;
  }

  await sodiumEncryptedSeal(X25519_KEY, `${KEY_PREFIX}${walletPrivateKey.value}`);
  setConfig();
};

const step2Handler = async () => {
  try {
    if (!window.ethereum) {
      singleToggle("error", `Error: Please install MetaMask or any other Ethereum wallet.`);
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // if wallet is still not connected then retry connecting
    if (!signer) {
      signer = await connectWallet();
      if (!signer) {
        singleToggle("error", `Error: Please connect to MetaMask.`);
        return;
      }
    }

    const walletChainId = await signer.getChainId();
    const configChainId = Number(chainIdSelect.value);

    window.ethereum.on("chainChanged", async (currentChainId: string) => {
      if (configChainId === parseInt(currentChainId, 16)) {
        singleToggle("success", ``);
      } else {
        singleToggle("error", `Error: Please connect to ${chainIdSelect.value}.`);
        switchNetwork(provider, configChainId);
      }
    });

    if (walletChainId !== configChainId) {
      if (!(await switchNetwork(provider, configChainId))) {
        singleToggle("error", `Error: Switch to the correct chain.`);
        return;
      }
    }

    // load token contract
    let token = "";
    if (configChainId === NetworkIds.Mainnet) {
      token = Tokens.DAI;
    } else if (configChainId === NetworkIds.Gnosis) {
      token = Tokens.WXDAI;
    }
    const erc20 = new ethers.Contract(token, erc20Abi, signer);
    const decimals = await erc20.decimals();
    const allowance = Number(allowanceInput.value);
    if (allowance <= 0) {
      singleToggle("error", `Error: Allowance should be greater than 0.`);
      return;
    }

    await erc20.approve(PERMIT2_ADDRESS, parseUnits(allowance.toString(), decimals));
    singleToggle("success", `Success`);
  } catch (error: any) {
    console.error(error);
    singleToggle("error", `Error: ${error.reason}`);
  }
};

const init = async () => {
  let conf = await getConf(true);
  if (conf !== undefined) {
    try {
      conf = JSON.parse(conf);
      defaultConf = conf as IConf;
      defaultConf["private-key-encrypted"] = "";
      setInputListeners();

      setBtn.addEventListener("click", async () => {
        if (currentStep === 1) {
          await step1Handler();
        } else if (currentStep === 2) {
          await step2Handler();
        }
      });
    } catch (error) {
      console.error(error);
    }
  } else {
    throw new Error("Default config fetch failed");
  }
};

init();
