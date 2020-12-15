import { NowRequest, NowResponse } from "@now/node";
import { getContract } from "../lib/contract";

import { generateLotteryDate } from "../utils/generateLotteryDate";
import { rates, ratesOld } from "../utils/lotteryRates";
import {
  getIssueIndex,
  getSingleLotteryBatch,
  SingleLottery,
} from "../utils/lotteryUtils";
import { ceilDecimal } from "../utils/mathUtils";

export const lottery = async (
  lotteryNumber: number
): Promise<
  | SingleLottery
  | {
      error?: string;
      errorMessage?: string;
      maxLotteryNumber?: number;
    }
> => {
  const issueIndex = await getIssueIndex();
  if (typeof issueIndex !== "number") {
    return issueIndex;
  }
  //Check if lotteryNumber is out of range (small 0 or bigger last Lottery (Drawn))
  if (lotteryNumber < 0 || lotteryNumber > issueIndex - 1) {
    return {
      error: "lotteryNumber out of range",
      errorMessage: `The LotteryNumber you provided is does not exists`,
      maxLotteryNumber: issueIndex - 1,
    };
  }
  const {
    numbers1: numbers1Prom,
    numbers2: numbers2Prom,
  } = getSingleLotteryBatch(lotteryNumber);
  const numbers1 = await numbers1Prom;
  const numbers2Res = await numbers2Prom;
  const numbers2: Array<number> = numbers2Res.map((n) => parseInt(n) / 1e18);

  const lotteryDate = generateLotteryDate(lotteryNumber);
  const ratesToUse = lotteryNumber >= 206 ? rates : ratesOld;
  const poolSize = numbers2[0];
  const lottery: SingleLottery = {
    lotteryNumber,
    lotteryDate,
    lotteryNumbers: numbers1.map((x) => Number(x)),
    poolSize: ceilDecimal(poolSize, 2),
    burned: ceilDecimal((poolSize / 100) * ratesToUse.burn, 2),
    contractLink:
      "https://bscscan.com/address/0x3c3f2049cc17c136a604be23cf7e42745edf3b91",
    jackpotTicket: numbers2[1] / 10,
    match2Ticket: numbers2[3] / 10,
    match3Ticket: numbers2[2] / 10,
    poolJackpot: ceilDecimal((poolSize / 100) * ratesToUse.jackpot, 2),
    poolMatch3: ceilDecimal((poolSize / 100) * ratesToUse.match3, 2),
    poolMatch2: ceilDecimal((poolSize / 100) * ratesToUse.match2, 2),
  };
  return lottery;
};

export default async (_req: NowRequest, res: NowResponse) => {
  const { lotteryNumber } = _req.query;
  if (
    typeof lotteryNumber !== "undefined" &&
    /\d/.test(lotteryNumber as string)
  ) {
    const data = await lottery(Number(lotteryNumber));
    res.status(200).send(data);
  } else {
    return res.status(400).send({ error: "Invalid Query param" });
  }
};
