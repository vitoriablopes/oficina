// Biblioteca de cada pessoa: enviar o que está só no aparelho para a conta e trazer a biblioteca antiga.
import { Store, getMedia, putMedia, saveItem, removeLocalItem, clearLocalOrder, saveOrder, legacyCount, importLegacy, touchItems } from './store.js';
import { ITEMS, rebuild } from './data.js';
import { esc, plural, toast, confirmBox } from './util.js';

/** Itens que estão só neste aparelho (não foram para a conta). */
export const locaisSoAqui = () => Object.keys(Store.items.local).filter((id) => !Store.items.nuvem[id]);

export async function enviarLocais(onProg = () => {}) {
  rebuild();
  const ids = locaisSoAqui();
  const ordem = {};
  let i = 0, grandes = [];
  for (const id of ids) {
    onProg(`${++i}/${ids.length}`);
    const it = ITEMS.find((x) => x.id === id);
    const nomes = it?.parsed.midias || [];
    const meds = (await Promise.all(nomes.map((n) => getMedia(n)))).filter(Boolean);
    if (meds.length) grandes.push(...(await putMedia(meds)));
    await saveItem({ id, codigo: Store.items.local[id].codigo }, { silent: true });
    if (Store.orderSrc.local[id] != null) ordem[id] = Store.orderSrc.local[id];
    await removeLocalItem(id);
  }
  if (Object.keys(ordem).length) await saveOrder(ordem);
  clearLocalOrder(ids);
  touchItems();
  return { n: ids.length, grandes };
}

/** Card/linhas para Ajustes e Estúdio. */
export function contaBiblioteca() {
  if (!Store.configured) return '';
  const n = locaisSoAqui().length;
  if (!Store.user) return n ? `<p class="small muted" style="margin:0">Você tem ${plural(n, 'item', 'itens')} salvos só neste aparelho. Entre na sua conta para levá-los para todos os seus aparelhos.</p>` : '';
  return `${n ? `<div class="card flat soft stack-s"><div class="small"><b>${plural(n, 'aula ou lista', 'aulas e listas')}</b> ${n === 1 ? 'está' : 'estão'} só neste aparelho.</div><div class="row"><button class="btn sm primary" data-enviarlocais>Enviar para a minha conta</button><span class="tiny muted" data-envprog></span></div></div>` : ''}
    ${Store.isLegacyAdmin ? `<div class="card flat soft stack-s" data-legacy hidden><div class="small">A <b>biblioteca compartilhada antiga</b> tem <b data-legn>…</b> itens. Agora cada conta tem a própria biblioteca: copie as suas aulas e listas de lá para a sua conta (as que já existem na sua conta não são substituídas).</div><div class="row"><button class="btn sm primary" data-legimport>Copiar para a minha conta</button><span class="tiny muted" data-legprog></span></div></div>` : ''}`;
}
export function wireContaBiblioteca(root, after) {
  root.querySelector('[data-enviarlocais]')?.addEventListener('click', async (e) => {
    const b = e.target; b.disabled = true;
    try {
      const r = await enviarLocais((t) => (root.querySelector('[data-envprog]').textContent = t));
      toast(`${plural(r.n, 'item enviado', 'itens enviados')} para a sua conta ✓${r.grandes.length ? ` (${plural(r.grandes.length, 'figura grande ficou', 'figuras grandes ficaram')} só neste aparelho)` : ''}`, 5000);
      after?.();
    } catch (err) { console.error(err); toast('Não consegui enviar: ' + err.message, 6000); b.disabled = false; }
  });
  const box = root.querySelector('[data-legacy]');
  if (box) legacyCount().then((n) => {
    if (!n) return;
    box.hidden = false; box.querySelector('[data-legn]').textContent = n;
    box.querySelector('[data-legimport]').onclick = async (e) => {
      if (!(await confirmBox('Copiar as aulas, listas, figuras e a ordem da biblioteca antiga para a sua conta?', { ok: 'Copiar' }))) return;
      e.target.disabled = true;
      try {
        const r = await importLegacy((t) => (box.querySelector('[data-legprog]').textContent = t));
        toast(`${plural(r.n, 'item copiado', 'itens copiados')}${r.pulados ? ` (${r.pulados} já existiam)` : ''} ✓`, 5000);
        after?.();
      } catch (err) { console.error(err); toast('Não consegui copiar: ' + err.message, 6000); e.target.disabled = false; }
    };
  });
}
