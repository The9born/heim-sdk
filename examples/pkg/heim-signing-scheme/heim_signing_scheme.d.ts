/* tslint:disable */
/* eslint-disable */
export function generate_g0_proof(initial_sub_policy_root_str: string, initial_threshold: number, initial_approver_set_root_str: string, initial_scope_tag_str: string, initial_worker_id_str: string, initial_epoch: bigint, initial_limit: bigint, initial_emergency_set_root_str: string, initial_emergency_threshold: number, initial_reset_wait_period: bigint, approver_ids_js: any, is_present_js: any): any;
export function verify_g0_proof(proof_js: any): boolean;
export function init_pair_key_dkg(centralized_party_secret_key_hex: string, session_id_str: string, access_structure_str: string, protocol_public_parameters_str: string, fixed_knowledge_of_discrete_log_uc_proof_local_typed_str: string): any;
export function init_pair_key_dkg_ed25519(centralized_party_secret_key_hex_ed25519: string, session_id_str: string, access_structure_str: string, protocol_public_parameters_str_ed25519: string, fixed_knowledge_of_discrete_log_uc_proof_local_typed_str: string): any;
export function init_presign(message_hex: string, centralized_party_secret_key_hex: string, hash_type_int: number, centralized_party_dkg_output_str: string, presign_str: string, protocol_public_parameters_str: string, signing_algorithm: number): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly generate_g0_proof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: bigint, k: bigint, l: number, m: number, n: number, o: bigint, p: any, q: any) => any;
  readonly verify_g0_proof: (a: any) => number;
  readonly init_pair_key_dkg: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => any;
  readonly init_pair_key_dkg_ed25519: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => any;
  readonly init_presign: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => [number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
