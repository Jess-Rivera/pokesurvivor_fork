/* ============ funding.js — donaciones ============
 * Donations are voluntary, give no advantage in the game and are
 * are used only to keep it online: servers and domain.
 * This file is the source of what is shown in the game (the "Support" button)
 * and on the /apoyar/ page. It is updated by hand:
 *
 *   kofi      Ko-fi username (empty = the button does not show)
 *   sponsors  GitHub Sponsors username (for whoever visits the repository)
 *   costs     expenses [item, euros per month]; if the cost is not fixed, a text
 */
G.Funding = {
  kofi: '',
  sponsors: 'JPTER78',
  costs: [
    ['Servidores (partidas, cuentas, ranking y multijugador)', 'Según cuánta gente juegue'],
    ['Dominio pokesurvivor.com', '≈12 € al año']
  ],
  get url() { return this.kofi ? 'https://ko-fi.com/' + this.kofi : ''; }
};
