import { InvalidEpochError, InvalidNewsroomNameError } from "./errors";
import { isEpoch } from "./epoch";

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const MAX_NAME_LENGTH = 255;
const MAX_LABEL_LENGTH = 63;

/**
 * Um nome de redação é um nome ENS terminado em `.eth`, com labels em
 * minúsculas formadas por `a-z`, `0-9` e `-` (sem hífen nas pontas).
 */
export function isNewsroomName(name: string): boolean {
  if (typeof name !== "string" || name.length === 0 || name.length > MAX_NAME_LENGTH) return false;
  if (!name.endsWith(".eth")) return false;
  return name.split(".").every(
    (label) => label.length > 0 && label.length <= MAX_LABEL_LENGTH && LABEL_RE.test(label),
  );
}

/**
 * Ação assinada pela World ID para uma submissão: `submit:<newsroom>:<epoch>`.
 * A ação amarra a prova de humanidade à redação e ao período exatos.
 */
export function actionFor(newsroom: string, epoch: string): string {
  if (!isNewsroomName(newsroom)) throw new InvalidNewsroomNameError(newsroom);
  if (!isEpoch(epoch)) throw new InvalidEpochError(epoch);
  return `submit:${newsroom}:${epoch}`;
}
