//
// Copyright 2018-21 Volker Sorge
//
// Licensed under the Apache on 2.0 (the "License");
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
 * @file Specialist computations to deal with tables from empheq.
 * @author volker.sorge@gmail.com (Volker Sorge)
 */

import { SemanticNode } from '../semantic_tree/semantic_node';

import { AbstractEnrichCase } from './abstract_enrich_case';
import * as EnrichMathml from './enrich_mathml';
import { setAttributes } from './enrich_attr';
import * as DomUtil from '../common/dom_util';

export class CaseEmpheq extends AbstractEnrichCase {
  /**
   * The actual mml tree.
   */
  public mml: Element;

  private mrows: Element[] = [];
  
  /**
   * Applicability test of the case.
   *
   * @param semantic The semantic node.
   * @returns True if case is applicable.
   */
  public static test(semantic: SemanticNode): boolean {
    return (
      !!semantic.mathmlTree &&
        !!semantic.annotation['Emph']
    );
  }

  /**
   * @override
   */
  constructor(semantic: SemanticNode) {
    super(semantic);
    this.mml = semantic.mathmlTree;
  }

  /**
   * @override
   */
  public getMathml() {
    // Basic idea:
    // Recurse until we find the table.
    // Every node that has a mathmlTree should be inserted directly.
    // For every node that does not have on a new mrow is inserted.
    // Only insert new mrows without children.
    console.log('Doing it here!');
    console.log(this.semantic.toString());
    this.recurseToTable(this.semantic);
    // if (!this.semantic.childNodes.length) {
    //   return this.mml;
    // }
    // return this.mml;
    // this.semantic.contentNodes.forEach(function (x) {
    //   EnrichMathml.walkTree(x as SemanticNode);
    //   // TODO: This needs to be done more principled.
    //   setAttributes(x.mathmlTree as Element, x);
    // });
    // this.semantic.childNodes.forEach(function (x) {
    //   EnrichMathml.walkTree(x as SemanticNode);
    // });
    // setAttributes(this.mml, this.semantic);
    // // TODO: The obsolete parent pointer is related to the issue above.
    // if (
    //   this.mml.getAttribute('data-semantic-id') ===
    //   this.mml.getAttribute('data-semantic-parent')
    // ) {
    //   this.mml.removeAttribute('data-semantic-parent');
    // }
    if (this.mrows.length) {
      let newRow = DomUtil.createElement('mrow');
      let parent = this.mml.parentNode;
      parent.insertBefore(newRow, this.mml);
      for (let mrow of this.mrows) {
        mrow.appendChild(this.mml);
        this.mml = mrow;
      }
      newRow.appendChild(this.mml);
    }
    return this.mml;
  }

  private recurseToTable(node: SemanticNode) {
    if (!node.mathmlTree ||
      (DomUtil.tagName(node.mathmlTree) === 'MTABLE' && node.annotation['Emph']?.length &&
        node.annotation['Emph'][0] !== 'table')) {
      // Add an empty mrow.
      let newNode = DomUtil.createElement('mrow');
      setAttributes(newNode, node);
      this.mrows.unshift(newNode);
    } else {
      if (DomUtil.tagName(node.mathmlTree) === 'MTABLE' && node.annotation['Emph']?.length &&
        node.annotation['Emph'][0] === 'table') {
        this.finalizeTable(node);
        return;
      }
      setAttributes(node.mathmlTree, node);
    }
    node.childNodes.forEach(this.recurseToTable.bind(this));
    node.contentNodes.forEach(this.recurseToTable.bind(this));
  }

  private finalizeTable(node: SemanticNode) {
    setAttributes(node.mathmlTree, node);
    delete node.annotation['Emph'];
    node.contentNodes.forEach((x) => {
      setAttributes(x.mathmlTree, x);
      delete x.annotation['Emph'];
    });
    node.childNodes.forEach((x) => {
      EnrichMathml.walkTree(x);
    });
    console.log(10);
  }
  
}
