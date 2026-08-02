export type TradeResult = 'Open' | 'Win' | 'Loss' | 'Breakeven'
export type Direction = 'Buy' | 'Sell'
export interface Trade {
 id:string; user_id:string; trade_date:string; entry_time:string|null; exit_time:string|null; pair:string; direction:Direction;
 strategy_id:string|null; entry_timeframe:string|null; higher_timeframe_trend:string|null; trading_period:string|null; zone_type:string|null;
 entry_price:number|null; stop_loss:number|null; take_profit:number|null; risk_percent:number|null; planned_rr:number|null;
 result:TradeResult; profit_loss:number|null; r_multiple:number|null; valid_zone:boolean; liquidity_marked:boolean;
 liquidity_swept:boolean; fvg_present:boolean; fvg_mitigated:boolean; candle_confirmation:boolean; followed_plan:boolean;
 setup_score:number; trade_grade:string; screenshot_before_url:string|null; screenshot_after_url:string|null;
 emotion_before:string|null; emotion_after:string|null; mistake:string|null; lesson_learned:string|null; what_went_well:string|null;
 reason_for_entry:string|null; reason_for_exit:string|null; source_platform:string|null; external_ticket:string|null; import_fingerprint:string|null; import_batch_id:string|null; created_at:string
}
export interface Backtest { id:string; user_id:string; date_tested:string; historical_trade_date:string; pair:string; direction:Direction;
 higher_timeframe_trend:string|null; entry_timeframe:string|null; zone_type:string|null; valid_zone:boolean; liquidity_marked:boolean;
 liquidity_swept:boolean; fvg_present:boolean; fvg_mitigated:boolean; candle_confirmation:boolean; entry_price:number|null;
 stop_loss:number|null; take_profit:number|null; planned_rr:number|null; result:'Win'|'Loss'|'Breakeven'; r_multiple:number|null;
 setup_score:number; trade_grade:string; screenshot_before_url:string|null; screenshot_after_url:string|null; lesson_learned:string|null; created_at:string }
export interface Strategy { id:string; user_id:string; name:string; version:string; description:string|null; is_active:boolean; is_default:boolean; created_at:string; updated_at:string; strategy_rules?:StrategyRule[] }
export interface StrategyRule { id:string; strategy_id:string; user_id:string; rule_key:string; label:string; weight:number; sort_order:number; is_required:boolean; created_at:string }
export interface TradeReview { id:string; user_id:string; trade_id:string; strategy_id:string|null; rule_answers:Record<string,boolean>; htf_trend:boolean; valid_zone:boolean; liquidity_sweep:boolean; fvg:boolean; bos:boolean; choch:boolean; confirmation_candle:boolean; news_checked:boolean; correct_session:boolean; risk_managed:boolean; confidence:number; patience:number; discipline:number; focus:number; stress:number; followed_plan:boolean; revenge_trade:boolean; fomo:boolean; overtraded:boolean; moved_stop_loss:boolean; moved_take_profit:boolean; lesson:string|null; strategy_score:number; psychology_score:number; discipline_score:number; overall_score:number; grade:string; coach_feedback:string|null; created_at:string; updated_at:string }

export interface Goal { id:string; user_id:string; name:string; metric:'monthly_profit'|'win_rate'|'average_r'|'max_trades_day'|'max_daily_loss'|'review_rate'|'strategy_compliance'|'psychology_score'; target_value:number; period:'monthly'|'all_time'; is_active:boolean; created_at:string; updated_at:string }

export interface LiveTradeAnalysis { id:string; user_id:string; strategy_id:string|null; pair:string; direction:Direction; trading_period:string|null; entry_timeframe:string|null; higher_timeframe_trend:string|null; entry_price:number|null; stop_loss:number|null; take_profit:number|null; risk_percent:number|null; planned_rr:number|null; rule_answers:Record<string,boolean>; setup_score:number; setup_grade:string; recommendation:string; notes:string|null; status:'Planned'|'Taken'|'Skipped'; created_at:string; updated_at:string }
