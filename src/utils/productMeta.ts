// Определяет Material-иконку по названию товара.
export function getProductIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('процессор') || n.includes('ryzen') || n.includes('core i') || n.includes('celeron') || n.includes('pentium') || n.includes('cpu')) return 'memory';
  if (n.includes('видеокарт') || n.includes('rtx') || n.includes('gtx') || n.includes('radeon') || n.includes('geforce')) return 'developer_board';
  if (n.includes('ноутбук') || n.includes('zephyrus') || n.includes('zenbook') || n.includes('vivobook') || n.includes('laptop')) return 'laptop_mac';
  if (n.includes('материнск') || n.includes('motherboard')) return 'view_quilt';
  if (n.includes('память') || n.includes('озу') || n.includes('ddr') || n.includes('dimm') || n.includes('ram')) return 'sim_card';
  if (n.includes('ssd') || n.includes('nvme') || n.includes('m.2') || n.includes('накопитель')) return 'save';
  if (n.includes('hdd') || n.includes('жёсткий') || n.includes('жесткий')) return 'hard_drive';
  if (n.includes('блок питания') || n.includes('psu')) return 'bolt';
  if (n.includes('корпус') || n.includes('системный блок')) return 'computer';
  if (n.includes('охлажден') || n.includes('кулер') || n.includes('cooler')) return 'wind_power';
  if (n.includes('монитор') || n.includes('display')) return 'monitor';
  if (n.includes('клавиатур') || n.includes('keyboard')) return 'keyboard';
  if (n.includes('мышь') || n.includes('mouse')) return 'mouse';
  if (n.includes('сборк') || n.includes('компьютер') || n.includes(' пк')) return 'computer';
  if (n.includes('принтер') || n.includes('printer')) return 'print';
  if (n.includes('роутер') || n.includes('router') || n.includes('wi-fi')) return 'router';
  return 'devices';
}

// Фотографии для товаров из главной страницы (ключ — products.Id в БД).
export const PRODUCT_IMAGES: Record<number, string> = {
  11: 'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQO1DqRVX94ToAhCE54A-3GlBIRbdYBSfzrVyceJg950MrA6uzpvYZjuLcoOp1e-oKwmYNDgC5bFESFdRw48BqeDWpOGVcIlBT-7X5ZbzjeqgJFqYZP2rZTMCodeuQZ088iF-7UsA&usqp=CAc',
  12: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTeTDR2PIa7n-BZHWnzNvpjUn_ZysJW6npBr7kG1HCXaM3NoSbfdgeVF8UXG75ziuSWS8lT8mQXEqg7Ykbp_taQT_c5BZwaNI5EJMat9VZW&usqp=CAc',
  13: 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRzFFUpJGD5M59brPe-CwFXvXCCw09jaJF2b_UACM9RoIFNF8_Je7wG9rSA_poqC7uU9ptnamXBOOhabsa2pM2I4LfjCZBi9ydRgqWg-zu4xXnPAAe6lUQly9OYVqhWSJDg8K-4J38Fug&usqp=CAc',
  14: 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTWsDFELX0IWDyYea-3ollTmEakmpvS6dvV-DWcq3PkE8fAuF5pz6Cu_AV-KxRnxprg9RcDa-9x4eWTyqKr2xbtBXPLh7tF8_vCbN7Ze-Zs1NM8PVZx68BQSEKHNiv5r-60arY1Gw&usqp=CAc',
};
