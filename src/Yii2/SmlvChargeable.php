<?php

namespace Smlv\Sdk\Yii2;

/**
 * Интерфейс, который должна реализовать каждая оплачиваемая модель SaaS-системы.
 *
 * SmlvChargeBehavior вызывает эти методы на EVENT_AFTER_INSERT и делегирует
 * списание в SMLV через Yii::$app->smlv->billing->chargeByEmail().
 *
 * Пример реализации в модели:
 *
 *   class Bill extends ActiveRecord implements SmlvChargeable
 *   {
 *       use SmlvChargeableTrait;   // базовая реализация — разрешает email + сумму
 *
 *       protected function getSmlvActionType(): ?string
 *       {
 *           return $this->doc_type === 'job_request'
 *               ? SmlvPricelist::TYPE_ORDER
 *               : SmlvPricelist::TYPE_BILL;
 *       }
 *
 *       protected function getSmlvAbonentId(): ?int
 *       {
 *           return $this->abonent_id ?? null;
 *       }
 *   }
 */
interface SmlvChargeable
{
    /**
     * Возвращает email пользователя, с чьего SMLV-депозита производится списание.
     * Если null — списание пропускается.
     */
    public function getChargeEmail(): ?string;

    /**
     * Возвращает сумму к списанию.
     * Если null или 0 — списание пропускается.
     */
    public function getChargeAmount(): ?float;

    /**
     * Возвращает текстовое описание транзакции (отображается в истории операций).
     */
    public function getChargeDescription(): string;

    /**
     * Возвращает произвольные метаданные, сохраняемые вместе с транзакцией.
     */
    public function getChargeMetadata(): array;
}
