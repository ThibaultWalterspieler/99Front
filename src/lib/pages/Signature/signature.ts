export const SIGNATURE_PLACEHOLDER_NAME = 'Firstname Lastname';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );

// Table layout + inline styles: mail apps strip <style>, classes, flexbox and SVG from signatures.
// The text has no color on purpose so it inherits the mail app's own color in light and dark mode,
// and the logo is an absolute URL so it still resolves once pasted into a mail app.
export const signatureHtml = (
  name: string,
) => `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:0 16px 0 0;vertical-align:middle;">
      <a href="https://99stud.com" style="text-decoration:none;"><img src="https://99stud.com/brand/99stud-logo-dark.png" width="71" height="64" alt="99stud" style="display:block;width:71px;height:64px;border:0;"></a>
    </td>
    <td style="vertical-align:top;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:17px;">
      <div style="font-size:16px;line-height:21px;font-weight:bold;">${escapeHtml(name)}</div>
      <div>99stud | Independent Creative Collective</div>
      <div style="padding-top:8px;max-width:340px;opacity:0.6;">Multidisciplinary collective based in Paris, Lyon and Milan. Blurring the lines between web, 3D and music.</div>
      <div style="padding-top:8px;"><a href="https://99stud.com" style="color:inherit;text-decoration:underline;">99stud.com</a><span style="opacity:0.4;">&nbsp;&nbsp;·&nbsp;&nbsp;</span><a href="https://www.instagram.com/99stud/" style="color:inherit;text-decoration:underline;">Instagram</a><span style="opacity:0.4;">&nbsp;&nbsp;·&nbsp;&nbsp;</span><a href="https://www.linkedin.com/company/100327275" style="color:inherit;text-decoration:underline;">LinkedIn</a></div>
    </td>
  </tr>
</table>`;

export const signatureText = (name: string) =>
  [
    name,
    '99stud | Independent Creative Collective',
    'Multidisciplinary collective based in Paris, Lyon and Milan. Blurring the lines between web, 3D and music.',
    'https://99stud.com · https://www.instagram.com/99stud/ · https://www.linkedin.com/company/100327275',
  ].join('\n');
