/**
 * QCM Lina — Google Apps Script
 * À conserver dans ton projet Apps Script (ne pas publier de secrets sur GitHub).
 * Déployer comme application Web : Exécuter en tant que Moi, accès Toute personne.
 */
const DESTINATAIRE = 'salah.touchi@gmail.com';
const MATIERES = ['Physique-chimie', 'SVT'];
function doGet() {
  return ContentService.createTextOutput('QCM Lina : service actif');
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return ContentService.createTextOutput('OCCUPE');
  try {
    const p = JSON.parse((e.postData && e.postData.contents) || '{}');
    const matiere = String(p.matiere || '').slice(0, 60);
    const note = Number(p.note);
    const total = Number(p.total);
    if (!MATIERES.includes(matiere) || !Number.isInteger(note) ||
        !Number.isInteger(total) || total < 1 || total > 100 ||
        note < 0 || note > total) {
      return ContentService.createTextOutput('INVALIDE');
    }
    const cache = CacheService.getScriptCache();
    const id = String(p.id || '').slice(0, 100);
    if (!/^[a-zA-Z0-9_-]{12,100}$/.test(id)) return ContentService.createTextOutput('ID_INVALIDE');
    if (cache.get('qcm_' + id)) return ContentService.createTextOutput('DOUBLON');
    // Limitation basique : 15 envois/heure, partagée par tous les visiteurs.
    const hour = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyyMMddHH');
    const key = 'quota_' + hour;
    const n = Number(cache.get(key) || '0');
    if (n >= 15) return ContentService.createTextOutput('QUOTA');
    const erreurs = Array.isArray(p.erreurs) ? p.erreurs.slice(0, 30).map(x =>
      '- ' + String(x.question || '').slice(0, 200) +
      '\n  Bonne réponse : ' + String(x.reponse || '').slice(0, 200)
    ).join('\n') : '';
    const duree = Math.max(0, Math.min(240, Number(p.dureeMinutes) || 0));
    const body = 'Résultat du QCM de Lina\n\n' +
      'Matière : ' + matiere + '\n' +
      'Note : ' + note + '/' + total + '\n' +
      'Date : ' + Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm') + '\n' +
      'Durée : ' + duree + ' minute(s)\n\n' +
      'Questions à revoir :\n' + (erreurs || 'Aucune erreur') +
      '\n\nRésultat transmis depuis le QCM en ligne (non certifié).';
    MailApp.sendEmail(DESTINATAIRE, 'QCM Lina — ' + matiere + ' — ' + note + '/' + total, body);
    cache.put('qcm_' + id, '1', 21600);
    cache.put(key, String(n + 1), 3600);
    return ContentService.createTextOutput('OK');
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput('ERREUR');
  } finally {
    lock.releaseLock();
  }
}
