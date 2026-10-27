# generar-ilustraciones.py → genera las ilustraciones SVG de Pepa de Oro (estilo plano, paleta cacao/oro/crema).
# Uso: python3 scripts/generar-ilustraciones.py frontend/public/img   (sobrescribe los .svg con el mismo nombre)
import os, sys

SALIDA = sys.argv[1]
CACAO = '#3b2314'; CACAO2 = '#57331d'; CACAO3 = '#8a5a3b'; ORO = '#c8962e'; ORO2 = '#e0b64f'; CREMA = '#f7ecd0'; CREMA2 = '#f7f1e6'; HOJA = '#2f6b3a'; HOJA2 = '#4f8f4a'

def guardar(ruta, contenido, w=800, h=600, titulo=''):
    ruta = os.path.join(SALIDA, ruta)
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{titulo}">\n<title>{titulo}</title>\n{contenido}\n</svg>\n'
    open(ruta, 'w', encoding='utf-8').write(svg)

def fondo(c1, c2, w=800, h=600, id='f'):
    return f'<defs><linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#{id})"/>'

def sombra(cx, cy, rx, ry=None):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry or rx*0.12}" fill="{CACAO}" opacity=".15"/>'

def mazorca(x, y, s=1, color=ORO, rot=0):
    # mazorca de cacao: elipse con surcos
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">'
            f'<ellipse cx="0" cy="0" rx="46" ry="92" fill="{color}"/>'
            f'<path d="M0 -92 C-20 -40 -20 40 0 92 M-24 -84 C-40 -30 -40 30 -24 84 M24 -84 C40 -30 40 30 24 84" stroke="{CACAO}" stroke-opacity=".25" stroke-width="5" fill="none"/>'
            f'<path d="M0 -92 q4 -22 16 -30" stroke="{HOJA}" stroke-width="8" fill="none" stroke-linecap="round"/></g>')

def grano(x, y, s=1, color=CACAO2, rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><ellipse rx="22" ry="34" fill="{color}"/>'
            f'<path d="M0 -30 C-6 -10 -6 10 0 30" stroke="{CACAO}" stroke-width="3" fill="none" opacity=".5"/></g>')

def hoja(x, y, s=1, rot=0, color=HOJA):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M0 0 C30 -40 90 -40 120 0 C90 40 30 40 0 0Z" fill="{color}"/>'
            f'<path d="M4 0 H116" stroke="#fff" stroke-opacity=".3" stroke-width="3"/></g>')

def cafe_grano(x, y, s=1, color='#5a3420', rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><ellipse rx="20" ry="27" fill="{color}"/>'
            f'<path d="M0 -25 C10 -8 -10 8 0 25" stroke="{CACAO}" stroke-width="4" fill="none"/></g>')

# ───────────── Barra de chocolate ─────────────
def barra(acento, texto, sub, cacao=CACAO2, fondo1=CREMA2, fondo2='#efe2c9', extra=''):
    cuadros = ''.join(f'<rect x="{230+i*90}" y="{150+j*80}" width="80" height="70" rx="8" fill="{cacao}" stroke="{CACAO}" stroke-opacity=".35" stroke-width="3"/>' for i in range(4) for j in range(2))
    return (fondo(fondo1, fondo2) + sombra(400, 520, 260) +
            f'<g transform="rotate(-8 400 300)">'
            f'<rect x="215" y="135" width="380" height="180" rx="14" fill="{CACAO}"/>{cuadros}'
            f'<rect x="200" y="290" width="410" height="200" rx="16" fill="{acento}"/>'
            f'<rect x="200" y="290" width="410" height="40" fill="{CACAO}" opacity=".12"/>'
            f'<text x="405" y="385" font-family="Georgia,serif" font-size="46" font-weight="700" fill="#fff" text-anchor="middle">{texto}</text>'
            f'<text x="405" y="425" font-family="Arial,sans-serif" font-size="22" fill="#fff" fill-opacity=".9" text-anchor="middle" letter-spacing="3">{sub}</text>'
            f'<text x="405" y="465" font-family="Arial,sans-serif" font-size="16" fill="#fff" fill-opacity=".75" text-anchor="middle" letter-spacing="2">PEPA DE ORO</text></g>' + extra)

def frutas(color, n=3):
    return ''.join(f'<circle cx="{620+i*40}" cy="{470-i*22}" r="{22-i*3}" fill="{color}"/>' for i in range(n))

productos = {
    'productos/chocolate-70.svg': ('Chocolate 70 %', barra('#7a3f17', '70 %', 'CACAO NACIONAL') + hoja(90, 470, .9, -20) + mazorca(140, 440, .7, ORO, -25)),
    'productos/chocolate-55.svg': ('Chocolate 55 %', barra('#a0602f', '55 %', 'SUAVE', cacao='#6b3f22') + mazorca(130, 440, .7, ORO, -25)),
    'productos/chocolate-85.svg': ('Chocolate 85 %', barra('#2a170c', '85 %', 'INTENSO', cacao='#3b2314') + grano(120, 470, 1.2) + grano(170, 500, 1, CACAO3, 30)),
    'productos/chocolate-leche.svg': ('Chocolate con leche', barra('#c98a4b', '40 %', 'CON LECHE', cacao='#8a5a3b') + f'<path d="M70 520 q40 -80 80 0z" fill="#fff"/><circle cx="110" cy="470" r="34" fill="#fff" opacity=".9"/>'),
    'productos/chocolate-blanco.svg': ('Chocolate blanco', barra('#d8c3a0', 'BLANCO', 'MANTECA DE CACAO', cacao='#f3e6cc') ),
    'productos/chocolate-maracuya.svg': ('Chocolate 70 % con maracuyá', barra('#d39a1a', 'MARACUYÁ', '70 % CACAO') + f'<circle cx="120" cy="470" r="60" fill="#e8b417"/><circle cx="120" cy="470" r="44" fill="#f5d36a"/>' + ''.join(f'<circle cx="{100+(i%3)*18}" cy="{455+(i//3)*16}" r="5" fill="#3b2314"/>' for i in range(9))),
    'productos/chocolate-cafe.svg': ('Chocolate 70 % con café', barra('#4a2a18', 'CAFÉ', 'DE ZARUMA') + cafe_grano(110, 470, 1.4, '#6b3b1f', 20) + cafe_grano(165, 505, 1.1, '#5a3420', -30)),
    'productos/chocolate-sal.svg': ('Chocolate 70 % con sal marina', barra('#2b5f8a', 'SAL MARINA', '70 % CACAO') + ''.join(f'<rect x="{80+i*26}" y="{470+(i%2)*20}" width="16" height="16" fill="#fff" transform="rotate(20 {88+i*26} {478+(i%2)*20})"/>' for i in range(5))),
}
for ruta, (t, c) in productos.items():
    guardar(ruta, c, titulo=t)

# Caja de 12 barras
guardar('productos/caja-12.svg', fondo(CREMA2, '#efe2c9') + sombra(400, 520, 270) +
    f'<path d="M150 230 L400 160 L650 230 L400 300Z" fill="{ORO2}"/><path d="M150 230 L400 300 L400 520 L150 450Z" fill="{ORO}"/><path d="M650 230 L400 300 L400 520 L650 450Z" fill="#a87a1f"/>'
    f'<text x="270" y="390" font-family="Georgia,serif" font-size="40" font-weight="700" fill="{CACAO}" transform="skewY(15) translate(0 -70)">12 × 70 %</text>'
    f'<text x="520" y="370" font-family="Arial,sans-serif" font-size="20" fill="#fff" transform="skewY(-15) translate(0 140)" letter-spacing="3">PEPA DE ORO</text>', titulo='Caja de 12 barras')

# Bombones
bombones = ''.join(f'<circle cx="{250+i*100}" cy="{250+j*100}" r="40" fill="{c}"/><path d="M{225+i*100} {245+j*100} q25 -18 50 0" stroke="{ORO2}" stroke-width="5" fill="none"/>'
                   for j, fila in enumerate([[CACAO2, '#7a3f17', CACAO2, '#a0602f'], ['#a0602f', CACAO2, '#7a3f17', CACAO2], [CACAO2, '#7a3f17', '#a0602f', CACAO2]]) for i, c in enumerate(fila))
guardar('productos/bombones.svg', fondo('#fbeedd', '#efd9bb') + sombra(400, 540, 280) +
    f'<rect x="170" y="170" width="460" height="340" rx="20" fill="{ORO}"/><rect x="190" y="190" width="420" height="300" rx="12" fill="#fff6e5"/>' + bombones, titulo='Bombones surtidos')

# Cobertura (funda con botones)
botones = ''.join(f'<ellipse cx="{120+i*55}" cy="{500+(i%3)*14}" rx="24" ry="14" fill="{CACAO2}"/>' for i in range(6))
guardar('productos/cobertura.svg', fondo(CREMA2, '#ead9bd') + sombra(400, 530, 220) +
    f'<path d="M260 120 h280 l30 60 v320 q0 30 -30 30 h-280 q-30 0 -30 -30 v-320z" fill="#7a3f17"/><rect x="260" y="110" width="280" height="30" rx="6" fill="{CACAO}"/>'
    f'<rect x="290" y="250" width="220" height="150" rx="12" fill="{CREMA}"/><text x="400" y="315" font-family="Georgia,serif" font-size="34" font-weight="700" fill="{CACAO}" text-anchor="middle">Cobertura</text>'
    f'<text x="400" y="355" font-family="Arial,sans-serif" font-size="20" fill="{CACAO2}" text-anchor="middle">chocolate de origen · 1 kg</text>' + botones, titulo='Cobertura para repostería')

# Nibs (bol)
nibs = ''.join(f'<rect x="{260+(i*37)%280}" y="{250+(i*23)%60}" width="18" height="12" rx="3" fill="{[CACAO2,CACAO3,"#6b3f22"][i%3]}" transform="rotate({(i*47)%90} {269+(i*37)%280} {256+(i*23)%60})"/>' for i in range(40))
guardar('productos/nibs.svg', fondo(CREMA2, '#ecdcc1') + sombra(400, 500, 230) + nibs + f'<path d="M180 300 h440 q-20 190 -220 190 q-200 0 -220 -190z" fill="#fff"/><path d="M180 300 h440" stroke="{CREMA}" stroke-width="6"/>'
    f'<text x="400" y="400" font-family="Georgia,serif" font-size="40" font-weight="700" fill="{CACAO}" text-anchor="middle">Nibs</text>' + grano(640, 470, 1.1) + grano(120, 480, .9, CACAO3, 40), titulo='Nibs de cacao')

# Cacao en polvo (tarro)
guardar('productos/cocoa.svg', fondo(CREMA2, '#ead9bd') + sombra(400, 520, 200) +
    f'<rect x="260" y="160" width="280" height="340" rx="22" fill="{CACAO2}"/><rect x="250" y="130" width="300" height="50" rx="12" fill="{ORO}"/>'
    f'<rect x="285" y="260" width="230" height="140" rx="10" fill="{CREMA}"/><text x="400" y="320" font-family="Georgia,serif" font-size="32" font-weight="700" fill="{CACAO}" text-anchor="middle">Cacao</text>'
    f'<text x="400" y="360" font-family="Arial,sans-serif" font-size="20" fill="{CACAO2}" text-anchor="middle">en polvo · 100 %</text>'
    f'<path d="M560 470 q60 -40 140 0 q-70 30 -140 0z" fill="#7a4a2a"/>', titulo='Cacao en polvo')

# Pasta de cacao (bloque)
guardar('productos/pasta.svg', fondo(CREMA2, '#ead9bd') + sombra(400, 500, 250) +
    f'<path d="M180 260 L420 200 L620 260 L380 320Z" fill="#6b3f22"/><path d="M180 260 L380 320 L380 460 L180 400Z" fill="{CACAO2}"/><path d="M620 260 L380 320 L380 460 L620 400Z" fill="{CACAO}"/>'
    f'<text x="400" y="545" font-family="Georgia,serif" font-size="30" font-weight="700" fill="{CACAO}" text-anchor="middle">Pasta de cacao 100 %</text>', titulo='Pasta de cacao')

# Manteca de cacao
guardar('productos/manteca.svg', fondo(CREMA2, '#ece0c8') + sombra(400, 500, 230) +
    f'<path d="M200 270 L420 210 L600 270 L380 330Z" fill="#fbf1d6"/><path d="M200 270 L380 330 L380 450 L200 390Z" fill="#efdcae"/><path d="M600 270 L380 330 L380 450 L600 390Z" fill="#e2c88f"/>'
    + mazorca(660, 420, .6, ORO, 20) + f'<text x="400" y="545" font-family="Georgia,serif" font-size="30" font-weight="700" fill="{CACAO}" text-anchor="middle">Manteca de cacao</text>', titulo='Manteca de cacao')

# Chocolate para taza
guardar('productos/chocolate-taza.svg', fondo('#fbeedd', '#efd9bb') + sombra(400, 520, 230) +
    f'<path d="M250 260 h300 v150 q0 90 -150 90 q-150 0 -150 -90z" fill="#fff"/><path d="M550 300 q80 0 80 60 q0 60 -80 60" stroke="#fff" stroke-width="24" fill="none"/>'
    f'<ellipse cx="400" cy="262" rx="150" ry="22" fill="{CACAO2}"/>'
    f'<path d="M340 200 q-20 -40 0 -80 M400 200 q-20 -40 0 -80 M460 200 q-20 -40 0 -80" stroke="{CACAO3}" stroke-width="8" fill="none" stroke-linecap="round" opacity=".5"/>'
    f'<rect x="120" y="420" width="90" height="60" rx="8" fill="{CACAO2}" transform="rotate(-12 165 450)"/>', titulo='Chocolate para taza')

# Mocca (tarro)
guardar('productos/mocca.svg', fondo(CREMA2, '#ead9bd') + sombra(400, 520, 200) +
    f'<rect x="270" y="170" width="260" height="330" rx="26" fill="#6b3b1f"/><rect x="260" y="140" width="280" height="44" rx="12" fill="{CACAO}"/>'
    f'<rect x="290" y="260" width="220" height="140" rx="10" fill="{ORO2}"/><text x="400" y="322" font-family="Georgia,serif" font-size="34" font-weight="700" fill="{CACAO}" text-anchor="middle">Mocca</text>'
    f'<text x="400" y="360" font-family="Arial,sans-serif" font-size="18" fill="{CACAO}" text-anchor="middle">cacao + café</text>' + cafe_grano(620, 470, 1.3) + grano(160, 470, 1.1), titulo='Mocca instantáneo')

# Café tostado (funda)
guardar('productos/cafe.svg', fondo('#f3e8d6', '#e6d2b3') + sombra(400, 530, 210) +
    f'<path d="M280 140 h240 l20 40 v320 q0 20 -20 20 h-240 q-20 0 -20 -20 v-320z" fill="{CACAO}"/><rect x="280" y="130" width="240" height="26" rx="5" fill="{ORO}"/>'
    f'<circle cx="400" cy="210" r="14" fill="{CACAO2}" stroke="{ORO2}" stroke-width="3"/>'
    f'<rect x="300" y="260" width="200" height="150" rx="10" fill="{CREMA}"/><text x="400" y="320" font-family="Georgia,serif" font-size="30" font-weight="700" fill="{CACAO}" text-anchor="middle">Café</text>'
    f'<text x="400" y="355" font-family="Arial,sans-serif" font-size="18" fill="{CACAO2}" text-anchor="middle">de Zaruma</text>'
    + ''.join(cafe_grano(140 + i * 30, 480 - (i % 2) * 20, .9, ['#5a3420', '#6b3b1f'][i % 2], i * 40) for i in range(4)) + cafe_grano(640, 480, 1.2), titulo='Café de Zaruma tostado')

# Café verde (saco)
guardar('productos/cafe-verde.svg', fondo('#eef0df', '#dfe3c6') + sombra(400, 530, 240) +
    f'<path d="M250 170 q150 -40 300 0 l30 300 q-180 50 -360 0z" fill="#c9b48a"/><path d="M260 180 q140 -30 280 0" stroke="#a8915f" stroke-width="6" fill="none"/>'
    f'<text x="400" y="340" font-family="Georgia,serif" font-size="30" font-weight="700" fill="{CACAO}" text-anchor="middle">Café verde</text><text x="400" y="375" font-family="Arial,sans-serif" font-size="18" fill="{CACAO2}" text-anchor="middle">arábica · 69 kg</text>'
    + ''.join(cafe_grano(130 + i * 34, 490 - (i % 2) * 18, .9, ['#8d9b5a', '#a4ad6b'][i % 2], i * 37) for i in range(4)), titulo='Café verde arábica')

# Cacao en grano (saco + granos + mazorca)
guardar('productos/cacao-grano.svg', fondo(CREMA2, '#ead9bd') + sombra(400, 530, 260) +
    f'<path d="M260 180 q140 -40 280 0 l30 300 q-170 50 -340 0z" fill="#c9a979"/><path d="M270 190 q130 -30 260 0" stroke="#a8875a" stroke-width="6" fill="none"/>'
    f'<text x="400" y="340" font-family="Georgia,serif" font-size="30" font-weight="700" fill="{CACAO}" text-anchor="middle">Cacao en grano</text><text x="400" y="375" font-family="Arial,sans-serif" font-size="18" fill="{CACAO2}" text-anchor="middle">saco de 69 kg · El Oro</text>'
    + ''.join(grano(120 + i * 36, 495 - (i % 2) * 16, .8, [CACAO2, CACAO3, '#6b3f22'][i % 3], i * 33) for i in range(4)) + mazorca(660, 430, .8, ORO, 15) + hoja(560, 500, .6, -10), titulo='Cacao en grano')

# Genérico
guardar('generico.svg', fondo(CREMA2, '#ead9bd') + mazorca(400, 300, 1.4, ORO, -15) + hoja(430, 330, .9, 25) + hoja(260, 300, .8, 200, HOJA2), titulo='Pepa de Oro')

# ───────────── Logo ─────────────
guardar('logo.svg', f'<circle cx="64" cy="64" r="62" fill="{CACAO}"/><circle cx="64" cy="64" r="54" fill="none" stroke="{ORO}" stroke-width="3"/>'
    f'<g transform="translate(64 68) rotate(-20)"><ellipse rx="22" ry="38" fill="{ORO2}"/><path d="M0 -38 C-9 -15 -9 15 0 38 M-11 -34 C-19 -12 -19 12 -11 34 M11 -34 C19 -12 19 12 11 34" stroke="{CACAO}" stroke-opacity=".35" stroke-width="3" fill="none"/>'
    f'<path d="M0 -38 q3 -10 10 -14" stroke="{HOJA2}" stroke-width="5" fill="none" stroke-linecap="round"/></g>', 128, 128, 'Pepa de Oro')

# ───────────── Paisajes (banners y haciendas) ─────────────
def arbol_cacao(x, y, s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-8" y="-10" width="16" height="110" rx="6" fill="{CACAO2}"/>'
            f'<circle cx="0" cy="-40" r="70" fill="{HOJA}"/><circle cx="-50" cy="-10" r="45" fill="{HOJA2}"/><circle cx="50" cy="-15" r="48" fill="#3f7d3e"/>'
            + mazorca(-12, 40, .22, ORO, 10) + mazorca(14, 55, .2, '#d9a03a', -10) + '</g>')

def paisaje(w, h, cielo=('#f7d9a0', '#f3efe2'), colinas=(HOJA2, HOJA, '#245a30'), arboles=6, sol=True, extra=''):
    c = fondo(*cielo, w, h, 'cielo')
    if sol: c += f'<circle cx="{w*0.78}" cy="{h*0.25}" r="{h*0.09}" fill="{ORO2}" opacity=".9"/>'
    c += f'<path d="M0 {h*0.55} Q{w*0.25} {h*0.40} {w*0.5} {h*0.52} T{w} {h*0.48} V{h} H0Z" fill="{colinas[0]}"/>'
    c += f'<path d="M0 {h*0.68} Q{w*0.3} {h*0.58} {w*0.6} {h*0.68} T{w} {h*0.62} V{h} H0Z" fill="{colinas[1]}"/>'
    for i in range(arboles):
        c += arbol_cacao(w * (0.08 + i * 0.84 / max(1, arboles - 1)), h * (0.70 + (i % 2) * 0.05), h / 900 * (0.9 + (i % 3) * 0.12))
    c += f'<path d="M0 {h*0.86} Q{w*0.4} {h*0.80} {w} {h*0.88} V{h} H0Z" fill="{colinas[2]}"/>'
    return c + extra

guardar('banners/haciendas.svg', paisaje(1600, 900, arboles=7), 1600, 900, 'Haciendas de cacao al atardecer')
barras_banner = ''.join(f'<g transform="translate({500+i*260} {420+(i%2)*60}) rotate({-10+i*8})"><rect x="-110" y="-60" width="220" height="120" rx="10" fill="{c}"/>'
                        + ''.join(f'<rect x="{-100+k*52}" y="{-50+m*55}" width="44" height="45" rx="5" fill="#000" opacity=".12"/>' for k in range(4) for m in range(2)) + '</g>'
                        for i, c in enumerate(['#7a3f17', CACAO2, '#a0602f', CACAO]))
guardar('banners/chocolate.svg', fondo('#2a170c', '#57331d', 1600, 900) + barras_banner + mazorca(300, 520, 1.6, ORO, -20) + hoja(170, 650, 1.4, -30) +
        ''.join(grano(1300 + i * 60, 720 - (i % 2) * 30, 1.2, [CACAO3, '#c08a5a'][i % 2], i * 30) for i in range(4)), 1600, 900, 'Chocolate de origen')

def tractor(x, y, s=1, color='#b3402a'):
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<rect x="-120" y="-60" width="180" height="60" rx="8" fill="{color}"/><rect x="-30" y="-140" width="90" height="85" rx="8" fill="{color}"/>'
            f'<rect x="-18" y="-128" width="66" height="50" rx="5" fill="#bfe0ef"/><rect x="-110" y="-95" width="14" height="40" fill="#555"/>'
            f'<circle cx="20" cy="10" r="62" fill="#2b211b"/><circle cx="20" cy="10" r="28" fill="{ORO}"/>'
            f'<circle cx="-95" cy="25" r="38" fill="#2b211b"/><circle cx="-95" cy="25" r="16" fill="{ORO}"/></g>')

def camion(x, y, s=1, color='#2b5f8a'):
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<rect x="-200" y="-150" width="250" height="140" rx="8" fill="#e9e1d3"/><text x="-75" y="-70" font-family="Georgia,serif" font-size="30" font-weight="700" fill="{CACAO}" text-anchor="middle">PEPA DE ORO</text>'
            f'<path d="M60 -110 h70 l45 55 v45 h-115z" fill="{color}"/><path d="M75 -100 h50 l32 40 h-82z" fill="#bfe0ef"/>'
            f'<rect x="-205" y="-12" width="385" height="14" fill="#444"/>'
            f'<circle cx="-140" cy="15" r="30" fill="#2b211b"/><circle cx="-140" cy="15" r="12" fill="#bbb"/><circle cx="120" cy="15" r="30" fill="#2b211b"/><circle cx="120" cy="15" r="12" fill="#bbb"/></g>')

guardar('banners/maquinaria.svg', paisaje(1600, 900, cielo=('#bfe0ef', '#f3efe2'), arboles=3, extra=tractor(560, 740, 1.5) + camion(1150, 760, 1.4)), 1600, 900, 'Maquinaria y transporte')

guardar('haciendas/la-esperanza.svg', paisaje(1200, 800, arboles=6), 1200, 800, 'Hacienda La Esperanza')
guardar('haciendas/san-jacinto.svg', paisaje(1200, 800, cielo=('#f3c58f', '#f6eadb'), colinas=('#6e9a4f', '#4f7f3c', '#2f5a2a'), arboles=5), 1200, 800, 'Hacienda San Jacinto')
# Alto Zaruma: montañas de café
cafetales = ''.join(f'<g transform="translate({90+i*140} {600+(i%2)*40})"><ellipse rx="55" ry="70" fill="{HOJA}"/>' + ''.join(f'<circle cx="{-25+k*16}" cy="{-10+(k%2)*22}" r="7" fill="#c0392b"/>' for k in range(4)) + '</g>' for i in range(8))
guardar('haciendas/alto-zaruma.svg', fondo('#cfe3ef', '#f3efe2', 1200, 800) + f'<path d="M0 420 L250 160 L450 380 L700 120 L1000 400 L1200 260 V800 H0Z" fill="#7d9c8a"/><path d="M640 170 L700 120 L760 175 Z" fill="#fff"/>'
        f'<path d="M0 520 Q300 420 600 520 T1200 480 V800 H0Z" fill="{HOJA2}"/>' + cafetales + f'<path d="M0 740 Q600 690 1200 750 V800 H0Z" fill="#2f5a2a"/>', 1200, 800, 'Hacienda Alto Zaruma (café de altura)')

# ───────────── Equipos ─────────────
def escena_equipo(contenido, c1='#eaf2f5', c2='#dde6d6'):
    return fondo(c1, c2) + f'<rect y="470" width="800" height="130" fill="#cdbb98"/>' + sombra(400, 500, 260) + contenido

guardar('equipos/tractor.svg', escena_equipo(tractor(430, 430, 1.5)), titulo='Tractor')
guardar('equipos/camion.svg', escena_equipo(camion(420, 440, 1.25)), titulo='Camión')
guardar('equipos/generico.svg', escena_equipo(f'<rect x="250" y="220" width="300" height="230" rx="16" fill="#8a6d4a"/><rect x="280" y="250" width="240" height="90" rx="8" fill="#e9e1d3"/>'
        f'<circle cx="330" cy="400" r="22" fill="{ORO}"/><circle cx="470" cy="400" r="22" fill="{ORO}"/><path d="M250 300 h-60 v80 h60" fill="none" stroke="#555" stroke-width="12"/>'), titulo='Equipo')
guardar('equipos/secadora.svg', escena_equipo(f'<rect x="170" y="230" width="460" height="220" rx="14" fill="#9aa5ab"/><rect x="190" y="250" width="420" height="70" rx="8" fill="{CACAO3}"/>'
        + ''.join(f'<ellipse cx="{215+i*40}" cy="285" rx="14" ry="9" fill="{CACAO2}"/>' for i in range(10)) +
        f'<rect x="200" y="340" width="120" height="90" rx="6" fill="#6f7b82"/><path d="M230 410 q15 -40 30 0 q15 -40 30 0" fill="#e8773a"/><circle cx="560" cy="385" r="35" fill="#6f7b82"/><path d="M560 350 v70 M525 385 h70" stroke="#9aa5ab" stroke-width="6"/>'), titulo='Secadora de cacao')
guardar('equipos/motocultor.svg', escena_equipo(f'<rect x="300" y="300" width="170" height="90" rx="10" fill="#b3402a"/><path d="M470 320 l170 -110" stroke="#444" stroke-width="16" stroke-linecap="round"/><path d="M630 200 h40" stroke="#222" stroke-width="16" stroke-linecap="round"/>'
        f'<circle cx="330" cy="420" r="55" fill="#2b211b"/><circle cx="330" cy="420" r="22" fill="{ORO}"/><path d="M200 440 h90" stroke="#777" stroke-width="10"/>' + ''.join(f'<path d="M{150+i*25} 450 l10 30" stroke="#666" stroke-width="7"/>' for i in range(5))), titulo='Motocultor')
guardar('equipos/despulpadora.svg', escena_equipo(f'<path d="M330 160 h140 l-30 90 h-80z" fill="#9aa5ab"/><rect x="290" y="250" width="220" height="150" rx="12" fill="#6f7b82"/><circle cx="400" cy="325" r="45" fill="#9aa5ab"/><circle cx="400" cy="325" r="15" fill="#444"/>'
        f'<rect x="300" y="400" width="20" height="70" fill="#444"/><rect x="480" y="400" width="20" height="70" fill="#444"/><path d="M510 350 l90 60" stroke="#6f7b82" stroke-width="22"/>' + ''.join(f'<circle cx="{350+i*22}" cy="{175+(i%2)*12}" r="9" fill="#c0392b"/>' for i in range(5))), titulo='Despulpadora de café')
guardar('equipos/generador.svg', escena_equipo(f'<rect x="220" y="260" width="360" height="190" rx="14" fill="#e0a21a"/><rect x="250" y="290" width="160" height="120" rx="8" fill="#2b211b"/>'
        + ''.join(f'<rect x="265" y="{305+i*20}" width="130" height="8" rx="4" fill="#555"/>' for i in range(5)) + f'<rect x="440" y="300" width="110" height="60" rx="6" fill="#fff"/><path d="M480 310 l-15 25 h20 l-15 25" stroke="#e0a21a" stroke-width="6" fill="none"/>'
        f'<circle cx="270" cy="465" r="18" fill="#2b211b"/><circle cx="530" cy="465" r="18" fill="#2b211b"/>'), titulo='Generador eléctrico')
guardar('equipos/fumigadora.svg', escena_equipo(f'<rect x="320" y="200" width="160" height="230" rx="40" fill="#2f7d46"/><rect x="345" y="230" width="110" height="60" rx="10" fill="#e3f2e7"/><text x="400" y="268" font-family="Arial" font-size="22" fill="#2f7d46" text-anchor="middle">20 L</text>'
        f'<path d="M480 360 q80 0 120 -80" stroke="#444" stroke-width="10" fill="none"/><path d="M600 280 l60 -40" stroke="#666" stroke-width="10" stroke-linecap="round"/>'
        + ''.join(f'<circle cx="{680+i*14}" cy="{225-i*10}" r="{5+i}" fill="#7fb3d5" opacity=".6"/>' for i in range(5)) + f'<path d="M340 200 q-40 -80 20 -120" stroke="#444" stroke-width="10" fill="none"/>'), titulo='Fumigadora de mochila')
print('ok')
