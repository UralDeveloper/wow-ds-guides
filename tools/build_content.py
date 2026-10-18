#!/usr/bin/env python3
"""Собирает front/data/content.json и front/maps/index.json.

Источники (data-src/):
  raid-config.json — дополнения → рейды → боссы → слои карт (+ калибровка ярдов)
  maps-src.json    — исходный файл карты → id сжатой картинки в front/maps, исходные размеры
  demo.json        — демо-рейд с примером тактики, гайда и фаз

Запуск из корня репозитория:  python3 tools/build_content.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data-src')
FRONT = os.path.join(ROOT, 'front')

LAYER_RU = {
    'Full Arena': 'Арена целиком', 'Main': 'Основная', 'Close Arena': 'Крупно', 'Arena': 'Арена',
    'Full': 'Целиком', 'Center': 'Центр', 'Left': 'Слева', 'Right': 'Справа',
    'Phase 1': 'Фаза 1', 'Phase 2': 'Фаза 2', 'Intermission': 'Интермиссия',
    'P3 Soaks': 'Фаза 3: соки', 'Phase 3 Broken': 'Фаза 3: разлом',
}


# Русские названия рейдов (официальная локализация)
RAID_RU = {
    'The Venomous Abyss': 'Отравленная бездна',
    'Tidebound Grotto': 'Приливный грот',
    "The Unbinding of Kith’ix": 'Освобождение Кит’икса',
    'The Voidspire': 'Шпиль Бездны',
    "March on Quel'Danas": "Марш на Кель'Данас",
    'The Dreamrift': 'Провал снов',
    'Sporefall': 'Споропад',
    'Manaforge Omega': 'Манагорн Омега',
    'Karazhan': 'Каражан',
    "Gruul's Lair": 'Логово Груула',
    "Magtheridon's Lair": 'Логово Магтеридона',
    'Serpentshrine Cavern': 'Змеиное святилище',
    'The Eye': 'Око',
    'The Battle for Mount Hyjal': 'Битва за гору Хиджал',
    'Black Temple': 'Черный храм',
    'Sunwell Plateau': 'Плато Солнечного Колодца',
}


# Русские имена боссов (локализация игры; классические рейды — по известным переводам)
BOSS_RU = {
    # Отравленная бездна
    "Nek'zali the Soulcoiler": "Нек'зали Душительница Душ", 'Entombed Sentinels': 'Погребенные стражи',
    'Vashnik the Malignant': 'Вашник Тлетворный', 'The Lost Explorers': 'Потерявшиеся исследователи',
    'Sszorak': 'Ссзорак', 'The Twin Fangs': 'Два Клыка', 'The Coiled Altar': 'Спиральный алтарь', "Ula'tek": "Ула'тек",
    # Приливный грот, Освобождение Кит'икса
    'Nymrissa Wavecaller': 'Нимрисса Волногон', 'Kith’ix': 'Кит’икс',
    # Шпиль Бездны
    'Imperator Averzian': 'Император Аверзиан', 'Vorasius': 'Ненасытникус', 'Fallen-King Salhadaar': 'Павший король Салхадаар',
    'Vaelgor & Ezzorak': 'Ваэлгор и Эззорак', 'Lightblinded Vanguard': 'Ослепленный авангард', 'Crown of the Cosmos': 'Корона космоса',
    # Марш на Кель'Данас, Провал снов, Споропад
    "Belo'ren, Child of Al'ar": "Бело'рен, Дитя Ал'ара", 'Midnight Falls': 'Торжество Полуночи',
    'Chimaerus the Undreamt God': 'Химерий, Неприснившийся Бог', 'Rotmire': 'Гнилотоп',
    # Манагорн Омега
    'Plexus Sentinel': 'Сплетенный страж', "Loom'Ithar": "Ткан'итар", 'Souldbinder Naazindhri': 'Стражница душ Наазиндри',
    'Forgeweaver Araz': 'Ткач горна Араз', 'The Soul Hunters': 'Ловцы душ', 'Fractillus': 'Разломий',
    'Nexus-King Salhadaar': 'Соправитель Салхадаар', 'Dimensius, the All-Devouring': 'Пространствус Всепоглощающий',
    # Каражан
    'Attumen the Huntsman': 'Ловчий Аттумен', 'Moroes': 'Мороуз', 'Maiden of Virtue': 'Благочестивая дева',
    'Opera Hall': 'Оперный театр', 'The Curator': 'Смотритель', 'Shade of Aran': 'Тень Арана',
    'Terestian Illhoof': 'Терестиан Больное Копыто', 'Netherspite': 'Гнев Пустоты', 'Chess Event': 'Шахматная партия',
    'Prince Malchezaar': 'Принц Малчезар',
    # Логово Груула, Логово Магтеридона
    'High King Maulgar': 'Король Молгар', 'Gruul the Dragonkiller': 'Груул Драконобой', 'Magtheridon': 'Магтеридон',
    # Змеиное святилище
    'Hydross the Unstable': 'Гидросс Нестабильный', 'The Lurker Below': 'Скрытень из глубин',
    'Leotheras the Blind': 'Леотерас Слепец', 'Fathom-Lord Karathress': 'Повелитель глубин Каратресс',
    'Morogrim Tidewalker': 'Морогрим Волноступ', 'Lady Vashj': 'Леди Вайш',
    # Око
    "Al'ar": "Ал'ар", 'Void Reaver': 'Страж Бездны', 'High Astromancer Solarian': 'Верховный звездочет Солариан',
    "Kael'thas Sunstrider": "Кель'тас Солнечный Скиталец",
    # Битва за гору Хиджал
    'Rage Winterchill': 'Лютый Хлад', 'Anetheron': 'Анетерон', "Kaz'rogal": "Каз'рогал", 'Azgalor': 'Азгалор',
    'Archimonde': 'Архимонд',
    # Черный храм
    "High Warlord Naj'entus": "Верховный полководец Надж'ентус", 'Supremus': 'Супремус', 'Shade of Akama': 'Тень Акамы',
    'Teron Gorefiend': 'Терон Кровожад', 'Gurtogg Bloodboil': 'Гуртогг Кипящая Кровь', 'Reliquary of Souls': 'Реликварий душ',
    'Mother Shahraz': 'Матушка Шахраз', 'The Illidari Council': 'Совет иллидари', 'Illidan Stormrage': 'Иллидан Ярость Бури',
    # Плато Солнечного Колодца
    'Kalecgos': 'Калесгос', 'Brutallus': 'Бруталл', 'Felmyst': 'Пророк Скверны', 'The Eredar Twins': 'Эредарские близнецы',
    "M'uru": "М'ару", "Kil'jaeden": "Кил'джеден",
}


def load(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return json.load(f)


def clean(name):
    return re.sub(r'\s+', ' ', name).strip()


def main():
    config = load('raid-config.json')
    maps_src = load('maps-src.json')
    demo = load('demo.json')
    sizes = {m['id']: m for m in json.load(open(os.path.join(FRONT, 'maps', 'index.json'), encoding='utf-8'))}

    meta = {}   # id карты → подпись, группа, калибровка
    raids = []
    expansions = []

    for exp in config:
        expansions.append({'id': 'x' + str(exp['id']), 'name': exp['name']})
        for r in sorted(exp['raids'], key=lambda x: x.get('sort_order', 0)):
            bosses = []
            for b in r['bosses']:
                layers, used = [], {}
                for lay in b.get('layers', []):
                    file = os.path.basename(lay['filename'])
                    if file not in maps_src:
                        print('нет картинки для', b['name'], file)
                        continue
                    src = maps_src[file]
                    label = LAYER_RU.get(lay['name'], lay['name'])
                    used[label] = used.get(label, 0) + 1
                    if used[label] > 1:
                        label += ' ' + str(used[label])
                    layers.append({'name': label, 'map': src['id']})
                    meta.setdefault(src['id'], {
                        'boss': BOSS_RU.get(clean(b['name']), clean(b['name'])), 'bossEn': clean(b['name']), 'layer': label,
                        'raid': RAID_RU.get(clean(r['name']), clean(r['name'])), 'raidEn': clean(r['name']),
                        'expansion': exp['name'], 'ow': src['ow'], 'oh': src['oh'],
                        'cal': lay.get('yard_calibration'), 'multi': len(b.get('layers', [])) > 1,
                    })
                ben = clean(b['name'])
                if ben not in BOSS_RU:
                    print('нет русского имени для босса', ben)
                bosses.append({
                    'id': str(b['id']),
                    'name': BOSS_RU.get(ben, ben),
                    'nameEn': ben,
                    'layers': layers,
                    'trash': [clean(t['name']) for t in b.get('trash', [])],
                    'tactics': None,
                    'guide': None,
                })
            en = clean(r['name'])
            if en not in RAID_RU:
                print('нет русского названия для рейда', en)
            raids.append({
                'id': 'r' + str(r['id']),
                'name': RAID_RU.get(en, en),
                'nameEn': en,
                'expansion': exp['name'],
                'season': r.get('season_name'),
                'current': bool(r.get('is_current_season')),
                'ptr': bool(r.get('is_ptr')),
                'bosses': bosses,
                'locked': [],
            })

    # Демо-рейд: пример заполненной тактики, гайда и фаз
    for r in demo['raids']:
        raids.append({**r, 'expansion': 'Демо', 'season': 'пример', 'demo': True,
                      'bosses': [{**b, 'demo': True, 'layers': [], 'trash': []} for b in r['bosses']]})
    expansions.append({'id': 'demo', 'name': 'Демо'})

    # Общие фазы для боссов без своей тактики: только стартовая расстановка
    base_marks = demo['phases'][0]['marks']
    generic = [{'name': n, 'route': '', 'marks': base_marks, 'zones': [], 'casts': []}
               for n in ('Фаза 1', 'Фаза 2', 'Фаза 3')]

    content = {
        '_note': 'Сгенерировано tools/build_content.py из data-src/. Не править вручную.',
        'expansions': expansions,
        'phases': demo['phases'],
        'genericPhases': generic,
        'tactics': demo['tactics'],
        'guides': demo['guides'],
        'raids': raids,
    }
    with open(os.path.join(FRONT, 'data', 'content.json'), 'w', encoding='utf-8') as f:
        json.dump(content, f, ensure_ascii=False, indent=1)

    # Манифест карт: подписи по боссам, группы по рейдам, калибровка в исходных пикселях
    manifest = []
    for mid, m in sizes.items():
        info = meta.get(mid)
        entry = {'id': mid, 'w': m['w'], 'h': m['h']}
        if info:
            entry['name'] = info['boss'] + (' · ' + info['layer'] if info['multi'] else '')
            entry['group'] = info['raid']
            entry['groupEn'] = info['raidEn']
            entry['nameEn'] = info['bossEn']
            entry['expansion'] = info['expansion']
            entry['ow'], entry['oh'] = info['ow'], info['oh']
            if info['cal']:
                c = info['cal']
                entry['cal'] = {'p1': c['point1'], 'p2': c['point2'], 'yards': c['yardsBetween']}
        else:
            entry['name'] = m.get('name', mid)
            entry['group'] = 'Прочее'
            entry['expansion'] = ''
        manifest.append(entry)
    order = {e['name']: i for i, e in enumerate(expansions)}
    raid_order = {r['name']: i for i, r in enumerate(raids)}
    manifest.sort(key=lambda e: (order.get(e['expansion'], 99), raid_order.get(e['group'], 99), e['name']))
    with open(os.path.join(FRONT, 'maps', 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    nb = sum(len(r['bosses']) for r in raids)
    print(f'{len(raids)} рейдов, {nb} боссов, {len(manifest)} карт, '
          f'{sum(1 for e in manifest if "cal" in e)} с калибровкой, '
          f'{sum(1 for e in manifest if e["group"] == "Прочее")} без босса')


if __name__ == '__main__':
    main()
