import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController, IonicModule } from '@ionic/angular';
import { Chain, Subscription, order_by } from '../core/types/zeus';
import { environment } from 'src/environments/environment';
import { DateAgoPipe } from '../core/pipe/date-ago.pipe';
import { HumanTypePipe } from '../core/pipe/human-type.pipe';
import { HumanSupplyPipe } from '../core/pipe/human-supply.pipe';
import { TokenDecimalsPipe } from '../core/pipe/token-with-decimals.pipe';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { PriceService } from '../core/service/price.service';
import { SortEvent } from 'primeng/api';
import { SellModalPage } from '../sell-modal/sell-modal.page';
import { WalletService } from '../core/service/wallet.service';

@Component({
  selector: 'app-markets',
  templateUrl: './markets.page.html',
  styleUrls: ['./markets.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DateAgoPipe, HumanTypePipe, DecimalPipe, HumanSupplyPipe, TokenDecimalsPipe, RouterLink, TableModule]
})
export class MarketsPage implements OnInit {

  isLoading = true;
  userAddress: string = '';
  tokens: any = null;
  offset = 0;
  limit = 500;
  lastFetchCount = 0;
  baseToken: any;

  constructor(private activatedRoute: ActivatedRoute, private priceService: PriceService, private modalCtrl: ModalController, private walletService: WalletService) {
    this.lastFetchCount = this.limit;
  }

  async ngOnInit() {
    this.activatedRoute.params.subscribe(async params => {
      if (await this.walletService.isConnected()) {
        this.userAddress = (await this.walletService.getAccount()).address;
      }

      this.isLoading = true;

      const chain = Chain(environment.api.endpoint);
      const tokensResult = await chain('query')({
        token: [
          {
            offset: this.offset,
            limit: this.limit,
          }, {
            id: true,
            transaction: {
              hash: true
            },
            token_open_positions: [
              {
                where: {
                  is_filled: {
                    _eq: false
                  },
                  is_cancelled: {
                    _eq: false
                  }
                }
              },
              {
                id: true
              }
            ],
            token_holders: [
              {
                where: {
                  address: {
                    _eq: this.userAddress
                  }
                }
              },
              {
                amount: true
              }
            ],
            current_owner: true,
            content_path: true,
            name: true,
            ticker: true,
            max_supply: true,
            circulating_supply: true,
            decimals: true,
            launch_timestamp: true,
            last_price_base: true,
            volume_24_base: true,
            date_created: true,
          }
        ],
        status: [
          {
            where: {
              chain_id: {
                _eq: environment.chain.chainId
              }
            }
          },
          {
            base_token: true,
            base_token_usd: true,
          }
        ]
      });
      this.tokens = tokensResult.token;
      this.baseToken = tokensResult.status[0];

      const wsChain = Subscription(environment.api.wss);
      wsChain('subscription')({
        status: [
          {
            where: {
              chain_id: {
                _eq: environment.chain.chainId
              }
            }
          },
          {
            base_token: true,
            base_token_usd: true,
          }
        ]
      }).on(({ status }) => {
        this.baseToken = status[0];
      });

      wsChain('subscription')({
        token: [
          {}, {
            id: true,
            token_open_positions: [
              {
                where: {
                  is_filled: {
                    _eq: false
                  },
                  is_cancelled: {
                    _eq: false
                  }
                }
              },
              {
                id: true
              }
            ],
            token_holders: [
              {
                where: {
                  address: {
                    _eq: this.userAddress
                  }
                }
              },
              {
                amount: true
              }
            ],
            name: true,
            ticker: true,
            decimals: true,
            last_price_base: true,
            volume_24_base: true,
          }
        ]
      }).on(({ token }) => {
        this.tokens = token;
      });

      this.isLoading = false;
    });
  }

  async listSale(event: any, ticker: string) {
    event.stopPropagation();
    const modal = await this.modalCtrl.create({
      keyboardClose: true,
      backdropDismiss: true,
      component: SellModalPage,

      componentProps: {
        ticker: ticker
      }
    });
    modal.present();
  }

  customSort(event: SortEvent) {
    if (event.field == 'listings') {
      event.data?.sort((data1, data2) => {
        let value1 = data1["token_open_positions"].length;
        let value2 = data2["token_open_positions"].length;
        let result = null;

        if (value1 == null && value2 != null) result = -1;
        else if (value1 != null && value2 == null) result = 1;
        else if (value1 == null && value2 == null) result = 0;
        else if (typeof value1 === 'string' && typeof value2 === 'string') result = value1.localeCompare(value2);
        else result = value1 < value2 ? -1 : value1 > value2 ? 1 : 0;

        return event.order as number * result;
      });

    }

    event.data?.sort((data1, data2) => {
      let value1 = data1[event.field as string];
      let value2 = data2[event.field as string];
      let result = null;

      if (value1 == null && value2 != null) result = -1;
      else if (value1 != null && value2 == null) result = 1;
      else if (value1 == null && value2 == null) result = 0;
      else if (typeof value1 === 'string' && typeof value2 === 'string') result = value1.localeCompare(value2);
      else result = value1 < value2 ? -1 : value1 > value2 ? 1 : 0;

      return event.order as number * result;
    });
  }


}
