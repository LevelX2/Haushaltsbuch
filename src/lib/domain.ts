import type {
  ConfidenceStatus,
  ImportSuggestionStatus,
  LifecycleStatus,
  LimitationType,
  PaymentStatus,
  PaymentType,
  RecurrenceClass,
  RecurrenceType,
} from "@prisma/client";

export const recurrenceTypeLabels: Record<RecurrenceType, string> = {
  MONTHLY: "monatlich",
  EVERY_TWO_MONTHS: "zweimonatlich",
  QUARTERLY: "quartalsweise",
  SEMI_YEARLY: "halbjährlich",
  YEARLY: "jährlich",
  WEEKLY: "wöchentlich",
  EVERY_FOUR_WEEKS: "vierwöchentlich",
  ONE_TIME: "einmalig",
  IRREGULAR: "unregelmäßig",
  CUSTOM: "benutzerdefiniert",
  UNCLEAR: "unklar",
};

export const recurrenceClassLabels: Record<RecurrenceClass, string> = {
  RECURRING: "regelmäßig",
  ONE_TIME: "einmalig",
  UNCLEAR: "unklar",
};

export const limitationTypeLabels: Record<LimitationType, string> = {
  UNLIMITED: "unbefristet",
  UNTIL_DATE: "befristet bis Datum",
  NUMBER_OF_PAYMENTS: "befristet nach Raten",
  UNKNOWN: "unbekannt",
  NOT_APPLICABLE: "nicht relevant",
};

export const lifecycleStatusLabels: Record<LifecycleStatus, string> = {
  ACTIVE: "aktiv",
  INACTIVE: "inaktiv",
  ENDED: "beendet",
};

export const confidenceStatusLabels: Record<ConfidenceStatus, string> = {
  SAFE: "sicher",
  ESTIMATED: "geschätzt",
  AUTO_DETECTED: "automatisch erkannt",
  MANUALLY_CONFIRMED: "manuell bestätigt",
  NEEDS_REVIEW: "zu prüfen",
  OBSOLETE: "veraltet",
  REPLACED: "ersetzt",
  IGNORED: "ignoriert",
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  NORMAL: "normale Ausgabe",
  PREPAYMENT: "Abschlag / Vorauszahlung",
  INSTALLMENT: "Rate",
  REFUND: "Rückerstattung",
  CORRECTION: "Korrektur",
  REVERSAL: "Storno",
  INCOME: "Einnahme",
  CASH_WITHDRAWAL: "Bargeldabhebung",
  TRANSFER: "Umbuchung",
  UNKNOWN: "unklar",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PLANNED: "erwartet",
  BOOKED: "gebucht",
  RECONCILED: "abgeglichen",
  NEEDS_REVIEW: "zu prüfen",
  IGNORED: "ignoriert",
};

export const suggestionStatusLabels: Record<ImportSuggestionStatus, string> = {
  OPEN: "offen",
  ACCEPTED: "übernommen",
  REJECTED: "abgelehnt",
  POSTPONED: "später prüfen",
  DUPLICATE: "Dublette",
  EDITED: "bearbeitet",
};

export const recurrenceTypes = Object.keys(recurrenceTypeLabels) as RecurrenceType[];
export const recurrenceClasses = Object.keys(recurrenceClassLabels) as RecurrenceClass[];
export const limitationTypes = Object.keys(limitationTypeLabels) as LimitationType[];
export const lifecycleStatuses = Object.keys(lifecycleStatusLabels) as LifecycleStatus[];
export const confidenceStatuses = Object.keys(confidenceStatusLabels) as ConfidenceStatus[];
export const paymentTypes = Object.keys(paymentTypeLabels) as PaymentType[];
export const paymentStatuses = Object.keys(paymentStatusLabels) as PaymentStatus[];
export const suggestionStatuses = Object.keys(suggestionStatusLabels) as ImportSuggestionStatus[];

export const documentTypes = [
  "RECHNUNG",
  "DAUERRECHNUNG",
  "BEITRAGSRECHNUNG",
  "BEITRAGSMITTEILUNG",
  "VERTRAG",
  "VERTRAGSÄNDERUNG",
  "KÜNDIGUNGSBESTÄTIGUNG",
  "ABSCHLAGSPLAN",
  "JAHRESABRECHNUNG",
  "BESCHEID",
  "ZAHLUNGSAUFFORDERUNG",
  "MAHNUNG",
  "GUTSCHRIFT",
  "RÜCKERSTATTUNG",
  "KONTOAUSZUG",
  "KREDITKARTENABRECHNUNG",
  "ZAHLUNGSDIENSTLEISTER_BELEG",
  "KASSENBON",
  "ANGEBOT",
  "AUFTRAGSBESTÄTIGUNG",
  "VERSICHERUNGSUNTERLAGE",
  "DARLEHENSUNTERLAGE",
  "LEASINGPLAN",
  "MIET_UND_NEBENKOSTEN",
  "WARTUNGSVERTRAG",
  "ABO_BESTÄTIGUNG",
  "EINKOMMENSBELEG",
  "STEUERBESCHEID",
  "UNKLAR",
] as const;

export const documentGroups = [
  "ZAHLUNGSBELEGE",
  "VERTRAGS_UND_STAMMDATENBELEGE",
  "ÄNDERUNGSBELEGE",
  "ABRECHNUNGSBELEGE",
  "KONTO_UND_ZAHLUNGSDATEN",
  "EINKOMMENSBELEGE",
  "PLANUNGS_UND_VORSTUFENBELEGE",
  "SONDERBELEGE",
] as const;
