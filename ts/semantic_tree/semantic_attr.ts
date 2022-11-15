//
// Copyright 2013 Google Inc.
// Copyright 2014-21 Volker Sorge
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @file Semantic attributes of Math symbols and expressions.
 *
 * This file contains the basic functionality to lookup and assign semantic
 * attributes for mathematical expressions. Since there is no such thing as a
 * well-defined semantics for all of mathematics we compute a default semantics
 * that closely models mathematical expressions found in K-12 mathematics as
 * well as in general undergraduate curriculum (i.e., calculus, linear algebra,
 * etc).
 *
 * Currently semantic attributes of symbols consist of the following two parts:
 *
 * type -- An unmutable property of an expression, regardless of its position in
 *         the math expression. For example, the letter 'f' will always have the
 *         type identifier, regardless of its use in context, e.g. as function
 *         symbol or variable.
 *
 * role -- A mutable description of the role an expression plays in the context
 *         of the overall mathematical expression. For instance, the symbol '|'
 *         is of type punctuation, but depending on context it has the role of a
 *         neutral fence or of a single vertical bar.
 *
 * In addition for some symbols we record the font as a further attribute.
 *
 * When a semantically interpreted expression is transformed into a XML
 * representation, types become tag names, while role, font, etc. are added as
 * attributes.
 *
 * This file is part of the content script as we do not want to call out to the
 * background page every time we need to look up the semantic of a symbol.
 * @author sorge@google.com (Volker Sorge)
 */

import {
  SemanticMeaning,
  SemanticRole,
  SemanticType,
  SemanticFont
} from './semantic_meaning';
import * as Alphabet from '../speech_rules/alphabet';

/**
 * Contains the basic mappings of characters/symbols and functions to semantic
 * attributes.
 *
 * Observe that all characters are given as hex code number in order to ease the
 * comparison with those in the JSON files that define speech rules per
 * character.
 */
// Punctuation Characters.
const generalPunctuations: string[] = [
  '!',
  '"',
  '#',
  '%',
  '&',
  ';',
  '?',
  '@',
  '\\',
  '¡',
  '§',
  '¶',
  '¿',
  '‗',
  '†',
  '‡',
  '•',
  '‣',
  '․',
  '‥',
  '‧',
  '‰',
  '‱',
  '‸',
  '※',
  '‼',
  '‽',
  '‾',
  '⁁',
  '⁂',
  '⁃',
  '⁇',
  '⁈',
  '⁉',
  '⁋',
  '⁌',
  '⁍',
  '⁎',
  '⁏',
  '⁐',
  '⁑',
  '⁓',
  '⁕',
  '⁖',
  '⁘',
  '⁙',
  '⁚',
  '⁛',
  '⁜',
  '⁝',
  '⁞',
  '︐',
  '︔',
  '︕',
  '︖',
  '︰',
  '﹅',
  '﹆',
  '﹉',
  '﹊',
  '﹋',
  '﹌',
  '﹔',
  '﹖',
  '﹗',
  '﹟',
  '﹠',
  '﹡',
  '﹨',
  '﹪',
  '﹫',
  '！',
  '＂',
  '＃',
  '％',
  '＆',
  '＇',
  '＊',
  '／',
  '；',
  '？',
  '＠',
  '＼'
];
const colons: string[] = ['︓', ':', '：', '﹕'];
const invisibleComma_: string = String.fromCodePoint(0x2063);
const commas: string[] = ['，', '﹐', ',', invisibleComma_];
const ellipses: string[] = ['…', '⋮', '⋯', '⋰', '⋱', '︙'];
const fullStops: string[] = ['.', '﹒', '．'];
const dashes: string[] = [
  '¯',
  '‒',
  '–',
  '—',
  '―',
  '﹘',
  '-',
  '⁻',
  '₋',
  '−',
  '➖',
  '﹣',
  '－',
  '‐',
  '‑',
  '‾',
  '_'
];
const tildes: string[] = ['~', '̃', '∼', '˜', '∽', '˷', '̴', '̰'];
const primes: string[] = ["'", '′', '″', '‴', '‵', '‶', '‷', '⁗', 'ʹ', 'ʺ'];
const degrees: string[] = ['°'];

// Fences.
// Fences are treated slightly differently from other symbols as we want to
// record pairs of opening/closing and top/bottom fences.
/**
 * Mapping opening to closing fences.
 */
const openClosePairs: { [key: string]: string } = {
  // Unicode categories Ps and Pe.
  // Observe that left quotation 301D could also be matched to 301F,
  // but is currently matched to 301E.
  '(': ')',
  '[': ']',
  '{': '}',
  '\u2045': '⁆',
  '\u2329': '〉',
  '\u2768': '❩',
  '\u276a': '❫',
  '\u276c': '❭',
  '\u276e': '❯',
  '\u2770': '❱',
  '\u2772': '❳',
  '\u2774': '❵',
  '\u27c5': '⟆',
  '\u27e6': '⟧',
  '\u27e8': '⟩',
  '\u27ea': '⟫',
  '\u27ec': '⟭',
  '\u27ee': '⟯',
  '\u2983': '⦄',
  '\u2985': '⦆',
  '\u2987': '⦈',
  '\u2989': '⦊',
  '\u298b': '⦌',
  '\u298d': '⦎',
  '\u298f': '⦐',
  '\u2991': '⦒',
  '\u2993': '⦔',
  '\u2995': '⦖',
  '\u2997': '⦘',
  '\u29d8': '⧙',
  '\u29da': '⧛',
  '\u29fc': '⧽',
  '\u2e22': '⸣',
  '\u2e24': '⸥',
  '\u2e26': '⸧',
  '\u2e28': '⸩',
  '\u3008': '〉',
  '\u300a': '》',
  '\u300c': '」',
  '\u300e': '』',
  '\u3010': '】',
  '\u3014': '〕',
  '\u3016': '〗',
  '\u3018': '〙',
  '\u301a': '〛',
  '\u301d': '〞',
  '\ufd3e': '﴿',
  '\ufe17': '︘',
  '\ufe59': '﹚',
  '\ufe5b': '﹜',
  '\ufe5d': '﹞',
  '\uff08': '）',
  '\uff3b': '］',
  '\uff5b': '｝',
  '\uff5f': '｠',
  '\uff62': '｣',
  // Unicode categories Sm and So.
  '\u2308': '⌉',
  '\u230a': '⌋',
  '\u230c': '⌍',
  '\u230e': '⌏',
  '\u231c': '⌝',
  '\u231e': '⌟',
  // Extender fences.
  // Parenthesis.
  '\u239b': '⎞',
  '\u239c': '⎟',
  '\u239d': '⎠',
  // Square bracket.
  '\u23a1': '⎤',
  '\u23a2': '⎥',
  '\u23a3': '⎦',
  // Curly bracket.
  '\u23a7': '⎫',
  '\u23a8': '⎬',
  '\u23a9': '⎭',
  '\u23b0': '⎱',
  '\u23b8': '⎹'
};

/**
 * Mapping top to bottom fences.
 */
const topBottomPairs: { [key: string]: string } = {
  '\u23b4': '⎵',
  '\u23dc': '⏝',
  '\u23de': '⏟',
  '\u23e0': '⏡',
  '\ufe35': '︶',
  '\ufe37': '︸',
  '\ufe39': '︺',
  '\ufe3b': '︼',
  '\ufe3d': '︾',
  '\ufe3f': '﹀',
  '\ufe41': '﹂',
  '\ufe43': '﹄',
  '\ufe47': '﹈'
};

const leftFences: string[] = Object.keys(openClosePairs);
const rightFences: string[] = Object.values(openClosePairs);
rightFences.push('〟');
const topFences: string[] = Object.keys(topBottomPairs);
const bottomFences: string[] = Object.values(topBottomPairs);

const neutralFences: string[] = [
  '|',
  '¦',
  '∣',
  '⏐',
  '⎸',
  '⎹',
  '❘',
  '｜',
  '￤',
  '︱',
  '︲'
];
const metricFences: string[] = ['‖', '∥', '⦀', '⫴'];
/**
 * Array of all fences.
 */
// const allFences: string[] = neutralFences.concat(
//   leftFences, rightFences, topFences, bottomFences);

// Identifiers.
const latinDoubleStruckItalic: string[] = ['ⅅ', 'ⅆ', 'ⅇ', 'ⅈ', 'ⅉ'];

// Greek Alphabets
const capitalGreek: string[] = [
  'Α',
  'Β',
  'Γ',
  'Δ',
  'Ε',
  'Ζ',
  'Η',
  'Θ',
  'Ι',
  'Κ',
  'Λ',
  'Μ',
  'Ν',
  'Ξ',
  'Ο',
  'Π',
  'Ρ',
  'Σ',
  'Τ',
  'Υ',
  'Φ',
  'Χ',
  'Ψ',
  'Ω'
];
const smallGreek: string[] = [
  'α',
  'β',
  'γ',
  'δ',
  'ε',
  'ζ',
  'η',
  'θ',
  'ι',
  'κ',
  'λ',
  'μ',
  'ν',
  'ξ',
  'ο',
  'π',
  'ρ',
  'ς',
  'σ',
  'τ',
  'υ',
  'φ',
  'χ',
  'ψ',
  'ω'
];
const capitalGreekBold: string[] = [
  '𝚨',
  '𝚩',
  '𝚪',
  '𝚫',
  '𝚬',
  '𝚭',
  '𝚮',
  '𝚯',
  '𝚰',
  '𝚱',
  '𝚲',
  '𝚳',
  '𝚴',
  '𝚵',
  '𝚶',
  '𝚷',
  '𝚸',
  '𝚺',
  '𝚻',
  '𝚼',
  '𝚽',
  '𝚾',
  '𝚿',
  '𝛀'
];
const smallGreekBold: string[] = [
  '𝛂',
  '𝛃',
  '𝛄',
  '𝛅',
  '𝛆',
  '𝛇',
  '𝛈',
  '𝛉',
  '𝛊',
  '𝛋',
  '𝛌',
  '𝛍',
  '𝛎',
  '𝛏',
  '𝛐',
  '𝛑',
  '𝛒',
  '𝛓',
  '𝛔',
  '𝛕',
  '𝛖',
  '𝛗',
  '𝛘',
  '𝛙',
  '𝛚'
];
const capitalGreekItalic: string[] = [
  '𝛢',
  '𝛣',
  '𝛤',
  '𝛥',
  '𝛦',
  '𝛧',
  '𝛨',
  '𝛩',
  '𝛪',
  '𝛫',
  '𝛬',
  '𝛭',
  '𝛮',
  '𝛯',
  '𝛰',
  '𝛱',
  '𝛲',
  '𝛴',
  '𝛵',
  '𝛶',
  '𝛷',
  '𝛸',
  '𝛹',
  '𝛺'
];
const smallGreekItalic: string[] = [
  '𝛼',
  '𝛽',
  '𝛾',
  '𝛿',
  '𝜀',
  '𝜁',
  '𝜂',
  '𝜃',
  '𝜄',
  '𝜅',
  '𝜆',
  '𝜇',
  '𝜈',
  '𝜉',
  '𝜊',
  '𝜋',
  '𝜌',
  '𝜍',
  '𝜎',
  '𝜏',
  '𝜐',
  '𝜑',
  '𝜒',
  '𝜓',
  '𝜔'
];
const capitalGreekBoldItalic: string[] = [
  '𝜜',
  '𝜝',
  '𝜞',
  '𝜟',
  '𝜠',
  '𝜡',
  '𝜢',
  '𝜣',
  '𝜤',
  '𝜥',
  '𝜦',
  '𝜧',
  '𝜨',
  '𝜩',
  '𝜪',
  '𝜫',
  '𝜬',
  '𝜮',
  '𝜯',
  '𝜰',
  '𝜱',
  '𝜲',
  '𝜳',
  '𝜴'
];
const smallGreekBoldItalic: string[] = [
  '𝜶',
  '𝜷',
  '𝜸',
  '𝜹',
  '𝜺',
  '𝜻',
  '𝜼',
  '𝜽',
  '𝜾',
  '𝜿',
  '𝝀',
  '𝝁',
  '𝝂',
  '𝝃',
  '𝝄',
  '𝝅',
  '𝝆',
  '𝝇',
  '𝝈',
  '𝝉',
  '𝝊',
  '𝝋',
  '𝝌',
  '𝝍',
  '𝝎'
];
const capitalGreekSansSerifBold: string[] = [
  '𝝖',
  '𝝗',
  '𝝘',
  '𝝙',
  '𝝚',
  '𝝛',
  '𝝜',
  '𝝝',
  '𝝞',
  '𝝟',
  '𝝠',
  '𝝡',
  '𝝢',
  '𝝣',
  '𝝤',
  '𝝥',
  '𝝦',
  '𝝨',
  '𝝩',
  '𝝪',
  '𝝫',
  '𝝬',
  '𝝭',
  '𝝮'
];
const smallGreekSansSerifBold: string[] = [
  '𝝰',
  '𝝱',
  '𝝲',
  '𝝳',
  '𝝴',
  '𝝵',
  '𝝶',
  '𝝷',
  '𝝸',
  '𝝹',
  '𝝺',
  '𝝻',
  '𝝼',
  '𝝽',
  '𝝾',
  '𝝿',
  '𝞀',
  '𝞁',
  '𝞂',
  '𝞃',
  '𝞄',
  '𝞅',
  '𝞆',
  '𝞇',
  '𝞈'
];
const capitalGreekSansSerifBoldItalic: string[] = [
  '𝞐',
  '𝞑',
  '𝞒',
  '𝞓',
  '𝞔',
  '𝞕',
  '𝞖',
  '𝞗',
  '𝞘',
  '𝞙',
  '𝞚',
  '𝞛',
  '𝞜',
  '𝞝',
  '𝞞',
  '𝞟',
  '𝞠',
  '𝞢',
  '𝞣',
  '𝞤',
  '𝞥',
  '𝞦',
  '𝞧',
  '𝞨'
];
const smallGreekSansSerifBoldItalic: string[] = [
  '𝞪',
  '𝞫',
  '𝞬',
  '𝞭',
  '𝞮',
  '𝞯',
  '𝞰',
  '𝞱',
  '𝞲',
  '𝞳',
  '𝞴',
  '𝞵',
  '𝞶',
  '𝞷',
  '𝞸',
  '𝞹',
  '𝞺',
  '𝞻',
  '𝞼',
  '𝞽',
  '𝞾',
  '𝞿',
  '𝟀',
  '𝟁',
  '𝟂'
];
const greekDoubleStruck: string[] = ['ℼ', 'ℽ', 'ℾ', 'ℿ'];
const greekSpecial: string[] = [
  'ϐ',
  'ϑ',
  'ϕ',
  'ϖ',
  'ϗ',
  'ϰ',
  'ϱ',
  'ϵ',
  '϶',
  'ϴ'
];
const greekSpecialBold: string[] = ['𝛜', '𝛝', '𝛞', '𝛟', '𝛠', '𝛡'];
const greekSpecialItalic: string[] = ['𝜖', '𝜗', '𝜘', '𝜙', '𝜚', '𝜛'];
const greekSpecialSansSerifBold: string[] = ['𝞊', '𝞋', '𝞌', '𝞍', '𝞎', '𝞏'];

// Other alphabets.
const hebrewLetters: string[] = ['ℵ', 'ℶ', 'ℷ', 'ℸ'];

let allLetters: string[] = [].concat(
  latinDoubleStruckItalic,
  capitalGreek,
  smallGreek,
  capitalGreekBold,
  smallGreekBold,
  capitalGreekItalic,
  smallGreekItalic,
  capitalGreekBoldItalic,
  smallGreekBoldItalic,
  capitalGreekSansSerifBold,
  smallGreekSansSerifBold,
  greekDoubleStruck,
  greekSpecial,
  capitalGreekSansSerifBoldItalic,
  smallGreekSansSerifBoldItalic,
  greekSpecialBold,
  greekSpecialItalic,
  greekSpecialSansSerifBold,
  hebrewLetters
);

// Operator symbols
const additions: string[] = [
  '+',
  '±',
  '∓',
  '∔',
  '∧',
  '∨',
  '∩',
  '∪',
  '⊌',
  '⊍',
  '⊎',
  '⊓',
  '⊔',
  '⊝',
  '⊞',
  '⊤',
  '⊥',
  '⊺',
  '⊻',
  '⊼',
  '⋄',
  '⋎',
  '⋏',
  '⋒',
  '⋓',
  '⩞',
  '⊕',
  '⋔'
];

/**
 * Invisible operator for plus.
 */
const invisiblePlus_: string = String.fromCodePoint(0x2064);
additions.push(invisiblePlus_);

const multiplications: string[] = [
  '†',
  '‡',
  '∐',
  '∗',
  '∘',
  '∙',
  '≀',
  '⊚',
  '⊛',
  '⊠',
  '⊡',
  '⋅',
  '⋆',
  '⋇',
  '⋈',
  '⋉',
  '⋊',
  '⋋',
  '⋌',
  '○',
  '·',
  '*',
  '⊗',
  '⊙'
];
/**
 * Invisible operator for multiplication.
 */
const invisibleTimes_: string = String.fromCodePoint(0x2062);
multiplications.push(invisibleTimes_);

const subtractions: string[] = [
  '¯',
  '-',
  '⁒',
  '⁻',
  '₋',
  '−',
  '∖',
  '∸',
  '≂',
  '⊖',
  '⊟',
  '➖',
  '⨩',
  '⨪',
  '⨫',
  '⨬',
  '⨺',
  '⩁',
  '﹣',
  '－',
  '‐',
  '‑'
];
const divisions: string[] = ['/', '÷', '⁄', '∕', '⊘', '⟌', '⦼', '⨸'];
/**
 * Invisible operator for function application.
 */
const functionApplication_: string = String.fromCodePoint(0x2061);

// Relation symbols
const equalities: string[] = [
  '=',
  '~',
  '⁼',
  '₌',
  '∼',
  '∽',
  '≃',
  '≅',
  '≈',
  '≊',
  '≋',
  '≌',
  '≍',
  '≎',
  '≑',
  '≒',
  '≓',
  '≔',
  '≕',
  '≖',
  '≗',
  '≘',
  '≙',
  '≚',
  '≛',
  '≜',
  '≝',
  '≞',
  '≟',
  '≡',
  '≣',
  '⧤',
  '⩦',
  '⩮',
  '⩯',
  '⩰',
  '⩱',
  '⩲',
  '⩳',
  '⩴',
  '⩵',
  '⩶',
  '⩷',
  '⩸',
  '⋕',
  '⩭',
  '⩪',
  '⩫',
  '⩬',
  '﹦',
  '＝',
  '⩬',
  '⊜',
  '∷'
];
const inequalities: string[] = [
  '<',
  '>',
  '≁',
  '≂',
  '≄',
  '≆',
  '≇',
  '≉',
  '≏',
  '≐',
  '≠',
  '≢',
  '≤',
  '≥',
  '≦',
  '≧',
  '≨',
  '≩',
  '≪',
  '≫',
  '≬',
  '≭',
  '≮',
  '≯',
  '≰',
  '≱',
  '≲',
  '≳',
  '≴',
  '≵',
  '≶',
  '≷',
  '≸',
  '≹',
  '≺',
  '≻',
  '≼',
  '≽',
  '≾',
  '≿',
  '⊀',
  '⊁',
  '⋖',
  '⋗',
  '⋘',
  '⋙',
  '⋚',
  '⋛',
  '⋜',
  '⋝',
  '⋞',
  '⋟',
  '⋠',
  '⋡',
  '⋦',
  '⋧',
  '⋨',
  '⋩',
  '⩹',
  '⩺',
  '⩻',
  '⩼',
  '⩽',
  '⩾',
  '⩿',
  '⪀',
  '⪁',
  '⪂',
  '⪃',
  '⪄',
  '⪅',
  '⪆',
  '⪇',
  '⪈',
  '⪉',
  '⪊',
  '⪋',
  '⪌',
  '⪍',
  '⪎',
  '⪏',
  '⪐',
  '⪑',
  '⪒',
  '⪓',
  '⪔',
  '⪕',
  '⪖',
  '⪗',
  '⪘',
  '⪙',
  '⪚',
  '⪛',
  '⪜',
  '⪝',
  '⪞',
  '⪟',
  '⪠',
  '⪡',
  '⪢',
  '⪣',
  '⪤',
  '⪥',
  '⪦',
  '⪧',
  '⪨',
  '⪩',
  '⪪',
  '⪫',
  '⪬',
  '⪭',
  '⪮',
  '⪯',
  '⪰',
  '⪱',
  '⪲',
  '⪳',
  '⪴',
  '⪵',
  '⪶',
  '⪷',
  '⪸',
  '⪹',
  '⪺',
  '⪻',
  '⪼',
  '⫷',
  '⫸',
  '⫹',
  '⫺',
  '⧀',
  '⧁',
  '﹤',
  '﹥',
  '＜',
  '＞'
];
const setRelations: string[] = [
  '⋢',
  '⋣',
  '⋤',
  '⋥',
  '⊂',
  '⊃',
  '⊄',
  '⊅',
  '⊆',
  '⊇',
  '⊈',
  '⊉',
  '⊊',
  '⊋',
  '⊏',
  '⊐',
  '⊑',
  '⊒',
  '⪽',
  '⪾',
  '⪿',
  '⫀',
  '⫁',
  '⫂',
  '⫃',
  '⫄',
  '⫅',
  '⫆',
  '⫇',
  '⫈',
  '⫉',
  '⫊',
  '⫋',
  '⫌',
  '⫍',
  '⫎',
  '⫏',
  '⫐',
  '⫑',
  '⫒',
  '⫓',
  '⫔',
  '⫕',
  '⫖',
  '⫗',
  '⫘',
  '⋐',
  '⋑',
  '⋪',
  '⋫',
  '⋬',
  '⋭',
  '⊲',
  '⊳',
  '⊴',
  '⊵'
];
const elementRelations: string[] = [
  '∈',
  '∊',
  '⋲',
  '⋳',
  '⋴',
  '⋵',
  '⋶',
  '⋷',
  '⋸',
  '⋹',
  '⋿'
];
const nonelementRelations: string[] = ['∉'];
const reelementRelations: string[] = ['∋', '∍', '⋺', '⋻', '⋼', '⋽', '⋾'];
const renonelementRelations: string[] = ['∌'];
const relations: string[] = [
  // TODO (sorge): Add all the other relations. Currently mainly tacks and
  // turnstyles.
  '⊢',
  '⊣',
  '⊦',
  '⊧',
  '⊨',
  '⊩',
  '⊪',
  '⊫',
  '⊬',
  '⊭',
  '⊮',
  '⊯',
  '⫞',
  '⫟',
  '⫠',
  '⫡',
  '⫢',
  '⫣',
  '⫤',
  '⫥',
  '⫦',
  '⫧',
  '⫨',
  '⫩',
  '⫪',
  '⫫',
  '⫬',
  '⫭'
];
const arrows: string[] = [
  '←',
  '↑',
  '→',
  '↓',
  '↔',
  '↕',
  '↖',
  '↗',
  '↘',
  '↙',
  '↚',
  '↛',
  '↜',
  '↝',
  '↞',
  '↟',
  '↠',
  '↡',
  '↢',
  '↣',
  '↤',
  '↥',
  '↦',
  '↧',
  '↨',
  '↩',
  '↪',
  '↫',
  '↬',
  '↭',
  '↮',
  '↯',
  '↰',
  '↱',
  '↲',
  '↳',
  '↴',
  '↵',
  '↶',
  '↷',
  '↸',
  '↹',
  '↺',
  '↻',
  '⇄',
  '⇅',
  '⇆',
  '⇇',
  '⇈',
  '⇉',
  '⇊',
  '⇍',
  '⇎',
  '⇏',
  '⇐',
  '⇑',
  '⇒',
  '⇓',
  '⇔',
  '⇕',
  '⇖',
  '⇗',
  '⇘',
  '⇙',
  '⇚',
  '⇛',
  '⇜',
  '⇝',
  '⇞',
  '⇟',
  '⇠',
  '⇡',
  '⇢',
  '⇣',
  '⇤',
  '⇥',
  '⇦',
  '⇧',
  '⇨',
  '⇩',
  '⇪',
  '⇫',
  '⇬',
  '⇭',
  '⇮',
  '⇯',
  '⇰',
  '⇱',
  '⇲',
  '⇳',
  '⇴',
  '⇵',
  '⇶',
  '⇷',
  '⇸',
  '⇹',
  '⇺',
  '⇻',
  '⇼',
  '⇽',
  '⇾',
  '⇿',
  '⌁',
  '⌃',
  '⌄',
  '⌤',
  '⎋',
  '➔',
  '➘',
  '➙',
  '➚',
  '➛',
  '➜',
  '➝',
  '➞',
  '➟',
  '➠',
  '➡',
  '➢',
  '➣',
  '➤',
  '➥',
  '➦',
  '➧',
  '➨',
  '➩',
  '➪',
  '➫',
  '➬',
  '➭',
  '➮',
  '➯',
  '➱',
  '➲',
  '➳',
  '➴',
  '➵',
  '➶',
  '➷',
  '➸',
  '➹',
  '➺',
  '➻',
  '➼',
  '➽',
  '➾',
  '⟰',
  '⟱',
  '⟲',
  '⟳',
  '⟴',
  '⟵',
  '⟶',
  '⟷',
  '⟸',
  '⟹',
  '⟺',
  '⟻',
  '⟼',
  '⟽',
  '⟾',
  '⟿',
  '⤀',
  '⤁',
  '⤂',
  '⤃',
  '⤄',
  '⤅',
  '⤆',
  '⤇',
  '⤈',
  '⤉',
  '⤊',
  '⤋',
  '⤌',
  '⤍',
  '⤎',
  '⤏',
  '⤐',
  '⤑',
  '⤒',
  '⤓',
  '⤔',
  '⤕',
  '⤖',
  '⤗',
  '⤘',
  '⤙',
  '⤚',
  '⤛',
  '⤜',
  '⤝',
  '⤞',
  '⤟',
  '⤠',
  '⤡',
  '⤢',
  '⤣',
  '⤤',
  '⤥',
  '⤦',
  '⤧',
  '⤨',
  '⤩',
  '⤪',
  '⤭',
  '⤮',
  '⤯',
  '⤰',
  '⤱',
  '⤲',
  '⤳',
  '⤴',
  '⤵',
  '⤶',
  '⤷',
  '⤸',
  '⤹',
  '⤺',
  '⤻',
  '⤼',
  '⤽',
  '⤾',
  '⤿',
  '⥀',
  '⥁',
  '⥂',
  '⥃',
  '⥄',
  '⥅',
  '⥆',
  '⥇',
  '⥈',
  '⥉',
  '⥰',
  '⥱',
  '⥲',
  '⥳',
  '⥴',
  '⥵',
  '⥶',
  '⥷',
  '⥸',
  '⥹',
  '⥺',
  '⥻',
  '⦳',
  '⦴',
  '⦽',
  '⧪',
  '⧬',
  '⧭',
  '⨗',
  '⬀',
  '⬁',
  '⬂',
  '⬃',
  '⬄',
  '⬅',
  '⬆',
  '⬇',
  '⬈',
  '⬉',
  '⬊',
  '⬋',
  '⬌',
  '⬍',
  '⬎',
  '⬏',
  '⬐',
  '⬑',
  '⬰',
  '⬱',
  '⬲',
  '⬳',
  '⬴',
  '⬵',
  '⬶',
  '⬷',
  '⬸',
  '⬹',
  '⬺',
  '⬻',
  '⬼',
  '⬽',
  '⬾',
  '⬿',
  '⭀',
  '⭁',
  '⭂',
  '⭃',
  '⭄',
  '⭅',
  '⭆',
  '⭇',
  '⭈',
  '⭉',
  '⭊',
  '⭋',
  '⭌',
  '￩',
  '￪',
  '￫',
  '￬',
  // Harpoons
  '↼',
  '↽',
  '↾',
  '↿',
  '⇀',
  '⇁',
  '⇂',
  '⇃',
  '⇋',
  '⇌',
  '⥊',
  '⥋',
  '⥌',
  '⥍',
  '⥎',
  '⥏',
  '⥐',
  '⥑',
  '⥒',
  '⥓',
  '⥔',
  '⥕',
  '⥖',
  '⥗',
  '⥘',
  '⥙',
  '⥚',
  '⥛',
  '⥜',
  '⥝',
  '⥞',
  '⥟',
  '⥠',
  '⥡',
  '⥢',
  '⥣',
  '⥤',
  '⥥',
  '⥦',
  '⥧',
  '⥨',
  '⥩',
  '⥪',
  '⥫',
  '⥬',
  '⥭',
  '⥮',
  '⥯',
  '⥼',
  '⥽',
  '⥾',
  '⥿'
];

// Big operation symbols
const sumOps: string[] = [
  '⅀', // double struck
  '∏',
  '∐',
  '∑',
  '⋀',
  '⋁',
  '⋂',
  '⋃',
  '⨀',
  '⨁',
  '⨂',
  '⨃',
  '⨄',
  '⨅',
  '⨆',
  '⨇',
  '⨈',
  '⨉',
  '⨊',
  '⨋',
  '⫼',
  '⫿'
];
const intOps: string[] = [
  '∫',
  '∬',
  '∭',
  '∮',
  '∯',
  '∰',
  '∱',
  '∲',
  '∳',
  '⨌',
  '⨍',
  '⨎',
  '⨏',
  '⨐',
  '⨑',
  '⨒',
  '⨓',
  '⨔',
  '⨕',
  '⨖',
  '⨗',
  '⨘',
  '⨙',
  '⨚',
  '⨛',
  '⨜'
];
const geometryOps: string[] = [
  '∟',
  '∠',
  '∡',
  '∢',
  '⊾',
  '⊿',
  // TODO: Add the entire geometric shape set programmatically.
  '△',
  '▷',
  '▽',
  '◁'
];
const prefixOps: string[] = ['∀', '∃', '∆', '∁', '∄'];
const prefixOpsBold: string[] = ['𝛁', '𝛛', '𝟊', '𝟋'];
const prefixOpsItalic: string[] = ['𝛻', '𝜕'];
const prefixOpsSansSerifBold: string[] = ['𝝯', '𝞉'];
// TODO (sorge) Insert nabla, differential operators sans serif bold italic

// const operatorBits: string[] =
//     // TODO (sorge) What to do if single glyphs of big ops occur on their own.
//     ['⌠', '⌡', '⎶', '⎪', '⎮', '⎯', '⎲', '⎳', '⎷'];

// Accents.
// TODO (sorge) Add accented characters.

// Numbers.
// Digits.
const digitsNormal: string[] = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9'
];
const digitsFullWidth: string[] = [
  '０',
  '１',
  '２',
  '３',
  '４',
  '５',
  '６',
  '７',
  '８',
  '９'
];
const digitsBold: string[] = ['𝟎', '𝟏', '𝟐', '𝟑', '𝟒', '𝟓', '𝟔', '𝟕', '𝟖', '𝟗'];
const digitsDoubleStruck: string[] = [
  '𝟘',
  '𝟙',
  '𝟚',
  '𝟛',
  '𝟜',
  '𝟝',
  '𝟞',
  '𝟟',
  '𝟠',
  '𝟡'
];
const digitsSansSerif: string[] = [
  '𝟢',
  '𝟣',
  '𝟤',
  '𝟥',
  '𝟦',
  '𝟧',
  '𝟨',
  '𝟩',
  '𝟪',
  '𝟫'
];
const digitsSansSerifBold: string[] = [
  '𝟬',
  '𝟭',
  '𝟮',
  '𝟯',
  '𝟰',
  '𝟱',
  '𝟲',
  '𝟳',
  '𝟴',
  '𝟵'
];
const digitsMonospace: string[] = [
  '𝟶',
  '𝟷',
  '𝟸',
  '𝟹',
  '𝟺',
  '𝟻',
  '𝟼',
  '𝟽',
  '𝟾',
  '𝟿'
];
const digitsSuperscript: string[] = [
  '²',
  '³',
  '¹',
  '⁰',
  '⁴',
  '⁵',
  '⁶',
  '⁷',
  '⁸',
  '⁹'
];
const digitsSubscript: string[] = [
  '₀',
  '₁',
  '₂',
  '₃',
  '₄',
  '₅',
  '₆',
  '₇',
  '₈',
  '₉'
];
const fractions: string[] = [
  '¼',
  '½',
  '¾',
  '⅐',
  '⅑',
  '⅒',
  '⅓',
  '⅔',
  '⅕',
  '⅖',
  '⅗',
  '⅘',
  '⅙',
  '⅚',
  '⅛',
  '⅜',
  '⅝',
  '⅞',
  '⅟',
  '↉'
];
const enclosedNumbers: string[] =
  // Encircled numbers.
  [
    '①',
    '②',
    '③',
    '④',
    '⑤',
    '⑥',
    '⑦',
    '⑧',
    '⑨',
    '⑩',
    '⑪',
    '⑫',
    '⑬',
    '⑭',
    '⑮',
    '⑯',
    '⑰',
    '⑱',
    '⑲',
    '⑳',
    '⓪',
    '⓫',
    '⓬',
    '⓭',
    '⓮',
    '⓯',
    '⓰',
    '⓱',
    '⓲',
    '⓳',
    '⓴',
    '⓵',
    '⓶',
    '⓷',
    '⓸',
    '⓹',
    '⓺',
    '⓻',
    '⓼',
    '⓽',
    '⓾',
    '⓿',
    '❶',
    '❷',
    '❸',
    '❹',
    '❺',
    '❻',
    '❼',
    '❽',
    '❾',
    '❿',
    '➀',
    '➁',
    '➂',
    '➃',
    '➄',
    '➅',
    '➆',
    '➇',
    '➈',
    '➉',
    '➊',
    '➋',
    '➌',
    '➍',
    '➎',
    '➏',
    '➐',
    '➑',
    '➒',
    '➓',
    '㉈',
    '㉉',
    '㉊',
    '㉋',
    '㉌',
    '㉍',
    '㉎',
    '㉏',
    '㉑',
    '㉒',
    '㉓',
    '㉔',
    '㉕',
    '㉖',
    '㉗',
    '㉘',
    '㉙',
    '㉚',
    '㉛',
    '㉜',
    '㉝',
    '㉞',
    '㉟',
    '㊱',
    '㊲',
    '㊳',
    '㊴',
    '㊵',
    '㊶',
    '㊷',
    '㊸',
    '㊹',
    '㊺',
    '㊻',
    '㊼',
    '㊽',
    '㊾',
    '㊿'
  ];
const fencedNumbers: string[] =
  // Numbers in Parenthesis.
  [
    '⑴',
    '⑵',
    '⑶',
    '⑷',
    '⑸',
    '⑹',
    '⑺',
    '⑻',
    '⑼',
    '⑽',
    '⑾',
    '⑿',
    '⒀',
    '⒁',
    '⒂',
    '⒃',
    '⒄',
    '⒅',
    '⒆',
    '⒇'
  ];
const punctuatedNumbers: string[] =
  // Numbers with other punctuation.
  [
    '⒈',
    '⒉',
    '⒊',
    '⒋',
    '⒌',
    '⒍',
    '⒎',
    '⒏',
    '⒐',
    '⒑',
    '⒒',
    '⒓',
    '⒔',
    '⒕',
    '⒖',
    '⒗',
    '⒘',
    '⒙',
    '⒚',
    '⒛', // full stop.
    '🄀',
    '🄁',
    '🄂',
    '🄃',
    '🄄',
    '🄅',
    '🄆',
    '🄇',
    '🄈',
    '🄉',
    '🄊' // comma.
  ];
/**
 * Array of all single digits.
 */
// const digits: string[] = digitsNormal.concat(
//       digitsFullWidth, digitsBold, digitsDoubleStruck,
//       digitsSansSerif, digitsSansSerifBold, digitsMonospace);
/**
 * Array of all non-digit number symbols.
 */
const numbers: string[] = fractions;
const otherNumbers: string[] = digitsSuperscript.concat(
  digitsSubscript,
  enclosedNumbers,
  fencedNumbers,
  punctuatedNumbers
);

/**
 * Array of all number symbols.
 */
// const allNumbers: string[] = digits.concat(numbers, otherNumbers);

// Functions.
const trigonometricFunctions: string[] = [
  'cos',
  'cot',
  'csc',
  'sec',
  'sin',
  'tan',
  'arccos',
  'arccot',
  'arccsc',
  'arcsec',
  'arcsin',
  'arctan',
  'arc cos',
  'arc cot',
  'arc csc',
  'arc sec',
  'arc sin',
  'arc tan'
];
const hyperbolicFunctions: string[] = [
  'cosh',
  'coth',
  'csch',
  'sech',
  'sinh',
  'tanh',
  'arcosh',
  'arcoth',
  'arcsch',
  'arsech',
  'arsinh',
  'artanh',
  'arccosh',
  'arccoth',
  'arccsch',
  'arcsech',
  'arcsinh',
  'arctanh'
];
const algebraicFunctions: string[] = [
  'deg',
  'det',
  'dim',
  'hom',
  'ker',
  'Tr',
  'tr'
];
const elementaryFunctions: string[] = [
  'log',
  'ln',
  'lg',
  'exp',
  'expt',
  'gcd',
  'gcd',
  'arg',
  'im',
  're',
  'Pr'
];
/**
 * All predefined prefix functions.
 */
const prefixFunctions: string[] = trigonometricFunctions.concat(
  hyperbolicFunctions,
  algebraicFunctions,
  elementaryFunctions
);

/**
 * Limit functions are handled separately as they can have lower (and upper)
 * limiting expressions.
 */
const limitFunctions: string[] = [
  'inf',
  'lim',
  'liminf',
  'limsup',
  'max',
  'min',
  'sup',
  'injlim',
  'projlim',
  'inj lim',
  'proj lim'
];
const infixFunctions: string[] = ['mod', 'rem'];

interface MeaningSet {
  set: string[];
  role: SemanticRole;
  type: SemanticType;
  font?: SemanticFont;
}

/**
 * Default assignments of semantic attributes.
 * Assigns sets of symbols to meaning.
 */
const symbolSetToSemantic_: MeaningSet[] = [
  // Punctuation
  {
    set: generalPunctuations,
    type: SemanticType.PUNCTUATION,
    role: SemanticRole.UNKNOWN
  },
  {
    set: colons,
    type: SemanticType.PUNCTUATION,
    role: SemanticRole.COLON
  },
  {
    set: commas,
    type: SemanticType.PUNCTUATION,
    role: SemanticRole.COMMA
  },
  {
    set: ellipses,
    type: SemanticType.PUNCTUATION,
    role: SemanticRole.ELLIPSIS
  },
  {
    set: fullStops,
    type: SemanticType.PUNCTUATION,
    role: SemanticRole.FULLSTOP
  },
  {
    set: dashes,
    type: SemanticType.OPERATOR,
    role: SemanticRole.DASH
  },
  {
    set: tildes,
    type: SemanticType.OPERATOR,
    role: SemanticRole.TILDE
  },
  {
    set: primes,
    type: SemanticType.PUNCTUATION,
    role: SemanticRole.PRIME
  },
  {
    set: degrees,
    type: SemanticType.PUNCTUATION,
    role: SemanticRole.DEGREE
  },
  // Fences
  {
    set: leftFences,
    type: SemanticType.FENCE,
    role: SemanticRole.OPEN
  },
  {
    set: rightFences,
    type: SemanticType.FENCE,
    role: SemanticRole.CLOSE
  },
  {
    set: topFences,
    type: SemanticType.FENCE,
    role: SemanticRole.TOP
  },
  {
    set: bottomFences,
    type: SemanticType.FENCE,
    role: SemanticRole.BOTTOM
  },
  {
    set: neutralFences,
    type: SemanticType.FENCE,
    role: SemanticRole.NEUTRAL
  },
  {
    set: metricFences,
    type: SemanticType.FENCE,
    role: SemanticRole.METRIC
  },
  // Single characters.
  // Latin alphabets.
  // {
  //   set: smallLatinFullWidth,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.NORMAL
  // },
  // {
  //   set: capitalLatinFullWidth,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.NORMAL
  // },
  // {
  //   set: smallLatinBold,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.BOLD
  // },
  // {
  //   set: capitalLatinBold,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.BOLD
  // },
  // {
  //   set: smallLatinItalic,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.ITALIC
  // },
  // {
  //   set: capitalLatinItalic,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.ITALIC
  // },
  // {
  //   set: smallLatinBoldItalic,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.BOLDITALIC
  // },
  // {
  //   set: capitalLatinBoldItalic,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.BOLDITALIC
  // },
  // {
  //   set: smallLatinScript,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SCRIPT
  // },
  // {
  //   set: capitalLatinScript,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SCRIPT
  // },
  // {
  //   set: smallLatinBoldScript,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.BOLDSCRIPT
  // },
  // {
  //   set: capitalLatinBoldScript,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.BOLDSCRIPT
  // },
  // {
  //   set: smallLatinFraktur,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.FRAKTUR
  // },
  // {
  //   set: capitalLatinFraktur,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.FRAKTUR
  // },
  // {
  //   set: smallLatinDoubleStruck,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.DOUBLESTRUCK
  // },
  // {
  //   set: capitalLatinDoubleStruck,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.DOUBLESTRUCK
  // },
  // {
  //   set: smallLatinBoldFraktur,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.BOLDFRAKTUR
  // },
  // {
  //   set: capitalLatinBoldFraktur,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.BOLDFRAKTUR
  // },
  // {
  //   set: smallLatinSansSerif,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SANSSERIF
  // },
  // {
  //   set: capitalLatinSansSerif,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SANSSERIF
  // },
  // {
  //   set: smallLatinSansSerifBold,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SANSSERIFBOLD
  // },
  // {
  //   set: capitalLatinSansSerifBold,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SANSSERIFBOLD
  // },
  // {
  //   set: smallLatinSansSerifItalic,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SANSSERIFITALIC
  // },
  // {
  //   set: capitalLatinSansSerifItalic,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SANSSERIFITALIC
  // },
  // {
  //   set: smallLatinSansSerifBoldItalic,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SANSSERIFBOLDITALIC
  // },
  // {
  //   set: capitalLatinSansSerifBoldItalic,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.SANSSERIFBOLDITALIC
  // },
  // {
  //   set: smallLatinMonospace,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.MONOSPACE
  // },
  // {
  //   set: capitalLatinMonospace,
  //   type: SemanticType.IDENTIFIER,
  //   role: SemanticRole.LATINLETTER,
  //   font: SemanticFont.MONOSPACE
  // },
  {
    set: latinDoubleStruckItalic,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.LATINLETTER,
    font: SemanticFont.DOUBLESTRUCKITALIC
  },
  // Greek alphabets.
  {
    set: smallGreek,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.NORMAL
  },
  {
    set: capitalGreek,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.NORMAL
  },
  {
    set: smallGreekBold,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.BOLD
  },
  {
    set: capitalGreekBold,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.BOLD
  },
  {
    set: smallGreekItalic,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.ITALIC
  },
  {
    set: capitalGreekItalic,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.ITALIC
  },
  {
    set: smallGreekBoldItalic,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.BOLDITALIC
  },
  {
    set: capitalGreekBoldItalic,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.BOLDITALIC
  },
  {
    set: smallGreekSansSerifBold,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.SANSSERIFBOLD
  },
  {
    set: capitalGreekSansSerifBold,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.SANSSERIFBOLD
  },
  {
    set: capitalGreekSansSerifBoldItalic,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.SANSSERIFBOLDITALIC
  },
  {
    set: smallGreekSansSerifBoldItalic,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.SANSSERIFBOLDITALIC
  },
  {
    set: greekDoubleStruck,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.DOUBLESTRUCK
  },
  {
    set: greekSpecial,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.NORMAL
  },
  {
    set: greekSpecialBold,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.BOLD
  },
  {
    set: greekSpecialItalic,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.ITALIC
  },
  {
    set: greekSpecialSansSerifBold,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.GREEKLETTER,
    font: SemanticFont.SANSSERIFBOLD
  },
  // Other alphabets.
  {
    set: hebrewLetters,
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.OTHERLETTER,
    font: SemanticFont.NORMAL
  },
  // Numbers.
  {
    set: digitsNormal,
    type: SemanticType.NUMBER,
    role: SemanticRole.INTEGER,
    font: SemanticFont.NORMAL
  },
  {
    set: digitsFullWidth,
    type: SemanticType.NUMBER,
    role: SemanticRole.INTEGER,
    font: SemanticFont.NORMAL
  },
  {
    set: digitsBold,
    type: SemanticType.NUMBER,
    role: SemanticRole.INTEGER,
    font: SemanticFont.BOLD
  },
  {
    set: digitsDoubleStruck,
    type: SemanticType.NUMBER,
    role: SemanticRole.INTEGER,
    font: SemanticFont.DOUBLESTRUCK
  },
  {
    set: digitsSansSerif,
    type: SemanticType.NUMBER,
    role: SemanticRole.INTEGER,
    font: SemanticFont.SANSSERIF
  },
  {
    set: digitsSansSerifBold,
    type: SemanticType.NUMBER,
    role: SemanticRole.INTEGER,
    font: SemanticFont.SANSSERIFBOLD
  },
  {
    set: digitsMonospace,
    type: SemanticType.NUMBER,
    role: SemanticRole.INTEGER,
    font: SemanticFont.MONOSPACE
  },
  {
    set: numbers,
    type: SemanticType.NUMBER,
    role: SemanticRole.FLOAT
  },
  {
    set: otherNumbers,
    type: SemanticType.NUMBER,
    role: SemanticRole.OTHERNUMBER
  },
  // Operators.
  {
    set: additions,
    type: SemanticType.OPERATOR,
    role: SemanticRole.ADDITION
  },
  {
    set: multiplications,
    type: SemanticType.OPERATOR,
    role: SemanticRole.MULTIPLICATION
  },
  {
    set: subtractions,
    type: SemanticType.OPERATOR,
    role: SemanticRole.SUBTRACTION
  },
  {
    set: divisions,
    type: SemanticType.OPERATOR,
    role: SemanticRole.DIVISION
  },
  {
    set: prefixOps,
    type: SemanticType.OPERATOR,
    role: SemanticRole.PREFIXOP
  },
  {
    set: prefixOpsBold,
    type: SemanticType.OPERATOR,
    role: SemanticRole.PREFIXOP,
    font: SemanticFont.BOLD
  },
  {
    set: prefixOpsItalic,
    type: SemanticType.OPERATOR,
    role: SemanticRole.PREFIXOP,
    font: SemanticFont.ITALIC
  },
  {
    set: prefixOpsSansSerifBold,
    type: SemanticType.OPERATOR,
    role: SemanticRole.PREFIXOP,
    font: SemanticFont.SANSSERIFBOLD
  },
  // Relations
  {
    set: equalities,
    type: SemanticType.RELATION,
    role: SemanticRole.EQUALITY
  },
  {
    set: inequalities,
    type: SemanticType.RELATION,
    role: SemanticRole.INEQUALITY
  },
  {
    set: setRelations,
    type: SemanticType.RELATION,
    role: SemanticRole.SET
  },
  {
    set: relations,
    type: SemanticType.RELATION,
    role: SemanticRole.UNKNOWN
  },
  {
    set: arrows,
    type: SemanticType.RELATION,
    role: SemanticRole.ARROW
  },
  // Membership. Currently treated as operator.
  {
    set: elementRelations,
    type: SemanticType.OPERATOR,
    role: SemanticRole.ELEMENT
  },
  {
    set: nonelementRelations,
    type: SemanticType.OPERATOR,
    role: SemanticRole.NONELEMENT
  },
  {
    set: reelementRelations,
    type: SemanticType.OPERATOR,
    role: SemanticRole.REELEMENT
  },
  {
    set: renonelementRelations,
    type: SemanticType.OPERATOR,
    role: SemanticRole.RENONELEMENT
  },
  // Large operators
  {
    set: sumOps,
    type: SemanticType.LARGEOP,
    role: SemanticRole.SUM
  },
  {
    set: intOps,
    type: SemanticType.LARGEOP,
    role: SemanticRole.INTEGRAL
  },
  {
    set: geometryOps, // TODO: Change that after speech rule work?
    type: SemanticType.OPERATOR,
    role: SemanticRole.GEOMETRY
  },
  // Functions
  {
    set: limitFunctions,
    type: SemanticType.FUNCTION,
    role: SemanticRole.LIMFUNC
  },
  {
    set: prefixFunctions,
    type: SemanticType.FUNCTION,
    role: SemanticRole.PREFIXFUNC
  },
  {
    set: infixFunctions,
    type: SemanticType.OPERATOR,
    role: SemanticRole.PREFIXFUNC
  },
  // TODO: Move these elsewhere.
  // dotless i and j.
  {
    set: ['ı', 'ȷ'],
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.LATINLETTER,
    font: SemanticFont.NORMAL
  },
  // dotless i and j.
  {
    set: ['𝚤', '𝚥'],
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.LATINLETTER,
    font: SemanticFont.ITALIC
  },
  // script small l
  // Powerset Cap P.
  {
    set: ['ℓ', '℘'],
    type: SemanticType.IDENTIFIER,
    role: SemanticRole.LATINLETTER,
    font: SemanticFont.SCRIPT
  }
];

/**
 * Equality on meaning objects.
 *
 * @param meaning1 First meaning.
 * @param meaning2 Second meaning.
 * @returns True if both contain the same field entries.
 */
export function equal(
  meaning1: SemanticMeaning,
  meaning2: SemanticMeaning
): boolean {
  return (
    meaning1.type === meaning2.type &&
    meaning1.role === meaning2.role &&
    meaning1.font === meaning2.font
  );
}

/**
 * Lookup the semantic type of a symbol.
 *
 * @param symbol The symbol to which we want to determine the type.
 * @returns The semantic type of the symbol.
 */
export function lookupType(symbol: string): SemanticType {
  return meaning_[symbol]?.type || SemanticType.UNKNOWN;
}

/**
 * Lookup the semantic role of a symbol.
 *
 * @param symbol The symbol to which we want to determine the role.
 * @returns The semantic role of the symbol.
 */
export function lookupRole(symbol: string): SemanticRole {
  return meaning_[symbol]?.role || SemanticRole.UNKNOWN;
}

/**
 * Lookup the semantic meaning of a symbol in terms of type and role.
 *
 * @param symbol The symbol to which we want to determine the meaning.
 * @returns The semantic meaning of the symbol.
 */
export function lookupMeaning(symbol: string): SemanticMeaning {
  return (
    meaning_[symbol] || {
      role: SemanticRole.UNKNOWN,
      type: SemanticType.UNKNOWN,
      font: SemanticFont.UNKNOWN
    }
  );
}

/**
 * String representation of the invisible times unicode character.
 *
 * @returns The invisible times character.
 */
export function invisibleTimes(): string {
  return invisibleTimes_;
}

/**
 * String representation of the invisible plus unicode character.
 *
 * @returns The invisible plus character.
 */
export function invisiblePlus(): string {
  return invisiblePlus_;
}

/**
 * String representation of the invisible comma unicode character.
 *
 * @returns The invisible comma character.
 */
export function invisibleComma(): string {
  return invisibleComma_;
}

/**
 * String representation of the function application character.
 *
 * @returns The invisible function application character.
 */
export function functionApplication(): string {
  return functionApplication_;
}

// /**
//  * Decide when two fences match. Currently we match any right to left
//  * or bottom to top fence and neutral to neutral.
//  * @param open Opening fence.
//  * @param close Closing fence.
//  * @return True if the fences are matching.
//  */
// export function isMatchingFenceRole(open: string, close: string): boolean {
//   return open === SemanticRole.OPEN &&
//     close === SemanticRole.CLOSE ||
//     isNeutralFence(open) && isNeutralFence(close) ||
//     open === SemanticRole.TOP && close === SemanticRole.BOTTOM;
// }

/**
 * Decide when opening and closing fences match. For neutral fences they have
 * to be the same.
 *
 * @param open Opening fence.
 * @param close Closing fence.
 * @returns True if the fences are matching.
 */
export function isMatchingFence(open: string, close: string): boolean {
  if (neutralFences.indexOf(open) !== -1 || metricFences.indexOf(open) !== -1) {
    return open === close;
  }
  return openClosePairs[open] === close || topBottomPairs[open] === close;
}

// /**
//  * Determines if a fence is an opening fence.
//  * @param fence Opening fence.
//  * @return True if the fence is open or neutral.
//  */
// export function isOpeningFence(fence: SemanticRole): boolean {
//   return fence === SemanticRole.OPEN || isNeutralFence(fence);
// }

// /**
//  * Determines if a fence is a closing fence.
//  * @param fence Closing fence.
//  * @return True if the fence is close or neutral.
//  */
// export function isClosingFence(fence: SemanticRole): boolean {
//   return fence === SemanticRole.CLOSE || isNeutralFence(fence);
// }

/**
 * Determines if a symbol type can be embellished. Primitives that can be
 * embellished are operators, punctuations, relations, and fences.
 *
 * @param type The type.
 * @returns True if the type can be embellished.
 */
export function isEmbellishedType(type: SemanticType): boolean {
  return (
    type === SemanticType.OPERATOR ||
    type === SemanticType.RELATION ||
    type === SemanticType.FENCE ||
    type === SemanticType.PUNCTUATION
  );
}

/**
 * Secondary annotation facility. This allows to compute a special annotation,
 * if desired.
 */

/**
 * The mapping for secondary annotations.
 */
const secondary_ = new Map();

/**
 * The key generator for secondary annotations.
 *
 * @param kind The kind of annotation.
 * @param char The character to look up.
 * @returns The generated key.
 */
function secKey(kind: string, char: string) {
  return `${kind} ${char}`;
}

/**
 * Builds the secondary annotation structure.
 *
 * @param kind The kind of annotation.
 * @param chars The characters to look up.
 * @param annotation Optionally an annotation value. Default is `kind`.
 */
function addSecondary_(kind: string, chars: string[], annotation = '') {
  for (const char of chars) {
    secondary_.set(secKey(kind, char), annotation || kind);
  }
}

addSecondary_('d', [
  'd',
  'ⅆ',
  'ｄ',
  '𝐝',
  '𝑑',
  '𝒹',
  '𝓭',
  '𝔡',
  '𝕕',
  '𝖉',
  '𝖽',
  '𝗱',
  '𝘥',
  '𝚍'
]);
addSecondary_('bar', dashes);
addSecondary_('tilde', tildes);

/**
 * Lookup of secondary annotation.
 *
 * @param kind The kind of annotation.
 * @param char The character to look up.
 * @returns The annotation if it exists.
 */
export function lookupSecondary(kind: string, char: string) {
  return secondary_.get(secKey(kind, char));
}


/**
 * Initializes the dictionary mapping strings to meaning.
 *
 * @returns The dictionary mapping strings to
 *     semantic attributes.
 */
const meaning_: { [key: string]: SemanticMeaning } = (function () {
  const result: { [key: string]: SemanticMeaning } = {};
  for (let i = 0, st: MeaningSet; (st = symbolSetToSemantic_[i]); i++) {
    st.set.forEach(function (symbol) {
      result[symbol] = {
        role: st.role || SemanticRole.UNKNOWN,
        type: st.type || SemanticType.UNKNOWN,
        font: st.font || SemanticFont.UNKNOWN
      };
    });
  }
  return result;
})();

/**
 * ORDERING:
 * * Create alphabets/numerals
 * * Add other semantics for single letters: position, meaning
 * * Add to regexp (e.g. all letters)
 * * Add secondary meaning: secondary string, position
 */

function changeSemantics(alphabet: string[], change: {[position: number]: SemanticMeaning}) {
  for (let [pos, meaning] of Object.entries(change)) {
    meaning_[alphabet[pos as unknown as number]] = meaning;
  }
}

function singleAlphabet(alphabet: Alphabet.Base, role: SemanticRole, font: SemanticFont, semfont: SemanticFont,
                        change: {[position: number]: SemanticMeaning} = {}) {
  let interval = Alphabet.INTERVALS.get(Alphabet.alphabetName(alphabet, font));
  if (interval) {
    interval.unicode.forEach(x => {
      meaning_[x] = {
        type: SemanticType.IDENTIFIER,
        role: role,
        font: semfont
      }
    });
    changeSemantics(interval.unicode, change);
    allLetters = allLetters.concat(interval.unicode);
  }
}

function alphabets() {
  for (let font of Object.values(SemanticFont)) {
    let semfont = font === SemanticFont.FULLWIDTH ? SemanticFont.NORMAL : font;
    singleAlphabet(Alphabet.Base.LATINCAP, SemanticRole.LATINLETTER, font, semfont);
    singleAlphabet(Alphabet.Base.LATINSMALL, SemanticRole.LATINLETTER, font, semfont);
    singleAlphabet(Alphabet.Base.GREEKCAP, SemanticRole.GREEKLETTER, font, semfont);
    singleAlphabet(Alphabet.Base.GREEKSMALL, SemanticRole.GREEKLETTER, font, semfont,
                   {0: {type: SemanticType.OPERATOR,
                        role: SemanticRole.PREFIXOP,
                        font: semfont},
                    26: {type: SemanticType.OPERATOR,
                        role: SemanticRole.PREFIXOP,
                        font: semfont} 
                   });
  }
  // const capitalLatin: string[] = Alphabet.INTERVALS.get(Alphabet.alphabetName(Alphabet.Base.LATINCAP, Alphabet.Font.NORMAL)).unicode;
  // const smallLatin: string[] = Alphabet.INTERVALS.get(Alphabet.alphabetName(Alphabet.Base.LATINSMALL, Alphabet.Font.NORMAL)).unicode;
}
alphabets();

export const allLettersRegExp = new RegExp(allLetters.join('|'));

