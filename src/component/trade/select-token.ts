import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import { range } from 'lit/directives/range.js';
import { map } from 'lit/directives/map.js';

import * as i18n from 'i18next';

import { baseStyles } from '../base.css';
import { AssetSelector } from './types';
import { AssetDetail } from '../../api/asset';
import { formatAmount, humanizeAmount, multipleAmounts } from '../../utils/amount';
import { isAssetInAllowed, isAssetOutAllowed } from '../../utils/asset';

import { Amount, PoolAsset } from '@galacticcouncil/sdk';

@customElement('gc-trade-app-select')
export class SelectToken extends LitElement {
  @property({ attribute: false }) assets: PoolAsset[] = [];
  @property({ attribute: false }) pairs: Map<string, PoolAsset[]> = new Map([]);
  @property({ attribute: false }) details: Map<string, AssetDetail> = new Map([]);
  @property({ attribute: false }) balances: Map<string, Amount> = new Map([]);
  @property({ attribute: false }) usdPrice: Map<string, Amount> = new Map([]);
  @property({ type: String }) assetIn = null;
  @property({ type: String }) assetOut = null;
  @property({ type: Boolean }) switchAllowed = true;
  @property({ attribute: false }) selector: AssetSelector = null;
  @property({ type: String }) query = '';

  static styles = [
    baseStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .search {
        padding: 0 14px;
        box-sizing: border-box;
      }

      @media (min-width: 768px) {
        .search {
          padding: 0 28px;
        }
      }

      uigc-asset-list {
        margin-top: 20px;
        overflow-y: auto;
      }

      .loading {
        align-items: center;
        display: flex;
        padding: 8px 28px;
        gap: 6px;
        border-bottom: 1px solid var(--hex-background-gray-800);
      }

      .loading > span.title {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    `,
  ];

  updateSearch(searchDetail: any) {
    this.query = searchDetail.value;
  }

  calculateDollarPrice(asset: PoolAsset, amount: string) {
    if (this.usdPrice.size == 0) {
      return null;
    }

    const usdPrice = this.usdPrice.get(asset.id);
    if (usdPrice == null) {
      return Number(amount).toFixed(2);
    }
    return multipleAmounts(amount, usdPrice).toFixed(2);
  }

  filterAssets(query: string) {
    return this.assets.filter((a) => a.symbol.toLowerCase().includes(query.toLowerCase()));
  }

  isDisabled(asset: PoolAsset): boolean {
    if (this.selector?.id == 'assetIn') {
      return this.switchAllowed ? !isAssetInAllowed(this.assets, this.pairs, asset.id) : this.assetOut == asset.symbol;
    } else if (this.selector?.id == 'assetOut') {
      return !isAssetOutAllowed(this.assets, this.pairs, asset.id);
    } else {
      return false;
    }
  }

  isSelected(asset: PoolAsset): boolean {
    return this.selector?.asset == asset.symbol;
  }

  getSlot(asset: PoolAsset): string {
    if (this.isSelected(asset)) {
      return 'selected';
    } else if (this.isDisabled(asset)) {
      return 'disabled';
    } else {
      return null;
    }
  }

  loadingTemplate() {
    return html`
      <div class="loading">
        <uigc-skeleton circle progress></uigc-skeleton>
        <span class="title">
          <uigc-skeleton progress rectangle width="40px" height="16px"></uigc-skeleton>
          <uigc-skeleton progress rectangle width="50px" height="8px"></uigc-skeleton>
        </span>
        <span class="grow"></span>
        <uigc-skeleton progress rectangle width="100px" height="16px"></uigc-skeleton>
      </div>
    `;
  }

  render() {
    return html`
      <slot name="header"></slot>
      <uigc-search-bar
        class="search"
        placeholder="${i18n.t('trade.searchByName')}"
        @search-changed=${(e: CustomEvent) => this.updateSearch(e.detail)}
      ></uigc-search-bar>
      ${when(
        this.assets.length > 0,
        () => html` <uigc-asset-list>
          ${map(this.filterAssets(this.query), (asset: PoolAsset) => {
            const balance = this.balances.get(asset.id);
            const balanceFormated = balance ? formatAmount(balance.amount, balance.decimals) : null;
            const balanceUsd = balance ? this.calculateDollarPrice(asset, balanceFormated) : null;
            return html`
              <uigc-asset-list-item
                slot=${this.getSlot(asset)}
                ?selected=${this.isSelected(asset)}
                ?disabled=${this.isDisabled(asset)}
                .asset=${asset}
                .desc=${this.details.get(asset.id).name}
                .balance=${humanizeAmount(balanceFormated)}
                .balanceUsd=${humanizeAmount(balanceUsd)}
              ></uigc-asset-list-item>
            `;
          })}
        </uigc-asset-list>`,
        () => html` <uigc-asset-list> ${map(range(3), (i) => this.loadingTemplate())} </uigc-asset-list> `
      )}
    `;
  }
}
