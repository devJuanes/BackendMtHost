import fs from "fs/promises";
import path from "path";
import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import { env } from "../config/env.js";
import type { HostingAccount } from "../types/index.js";
import { NotFoundError, ConflictError } from "../utils/errors.js";
import * as domainService from "./domain.service.js";
import { ensureDefaultSite, getPanelUrl } from "../utils/default-site.js";
import { renderDefaultSiteHtml } from "../templates/default-site.js";

export async function listHosting(userId: string): Promise<HostingAccount[]> {
  const { data, error } = await getDb()
    .from("hosting_accounts")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  throwIfMatuError(error);
  return (data ?? []) as HostingAccount[];
}

export async function getHosting(userId: string, id: string): Promise<HostingAccount> {
  const { data, error } = await getDb()
    .from("hosting_accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .neq("status", "deleted")
    .single();

  throwIfMatuError(error, "Hosting account not found");
  if (!data) throw new NotFoundError("Hosting account not found");
  return data as HostingAccount;
}

export async function createHosting(
  userId: string,
  data: { label: string; username: string; domain_id?: string }
): Promise<HostingAccount> {
  const { data: dup } = await getDb()
    .from("hosting_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("username", data.username)
    .limit(1);

  if (dup && dup.length > 0) throw new ConflictError("Username already in use");

  let documentRoot = path.join(env.DEFAULT_DOCUMENT_ROOT, userId, data.username, "public_html");

  let fqdnForSite = data.label;

  if (data.domain_id) {
    const domain = await domainService.getDomain(userId, data.domain_id);
    documentRoot = path.join(env.DEFAULT_DOCUMENT_ROOT, domain.fqdn, "public_html");
    fqdnForSite = domain.fqdn;
    await ensureDefaultSite(domain.fqdn);
  } else {
    await fs.mkdir(documentRoot, { recursive: true });
    await fs.writeFile(
      path.join(documentRoot, "index.html"),
      `<!-- matuhost-default-site -->\n` +
        renderDefaultSiteHtml({ fqdn: fqdnForSite, panelUrl: getPanelUrl() }),
      "utf-8"
    );
  }

  const { data: inserted, error } = await getDb().from("hosting_accounts").insert({
    user_id: userId,
    domain_id: data.domain_id ?? null,
    label: data.label,
    username: data.username,
    document_root: documentRoot,
    status: "active",
  });

  throwIfMatuError(error);
  return pickRow<HostingAccount>(inserted);
}

export async function updateHostingStatus(
  userId: string,
  id: string,
  status: HostingAccount["status"]
): Promise<HostingAccount> {
  await getHosting(userId, id);
  const { data: rows, error } = await getDb()
    .from("hosting_accounts")
    .eq("id", id)
    .eq("user_id", userId)
    .update({ status, updated_at: new Date().toISOString() });

  throwIfMatuError(error);
  return pickRow<HostingAccount>(rows);
}

export async function deleteHosting(userId: string, id: string): Promise<void> {
  await getHosting(userId, id);
  const { error } = await getDb()
    .from("hosting_accounts")
    .eq("id", id)
    .eq("user_id", userId)
    .update({ status: "deleted", updated_at: new Date().toISOString() });
  throwIfMatuError(error);
}
