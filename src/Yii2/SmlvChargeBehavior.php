<?php

namespace Smlv\Sdk\Yii2;

use Yii;
use yii\base\Behavior;
use yii\db\ActiveRecord;

/**
 * Yii2 Behavior — автоматическое списание SMLV-депозита при сохранении модели.
 *
 * Подключается к модели, реализующей SmlvChargeable:
 *
 *   use Smlv\Sdk\Yii2\SmlvChargeBehavior;
 *
 *   public function behaviors(): array
 *   {
 *       return ArrayHelper::merge(parent::behaviors(), [
 *           'smlvCharge' => SmlvChargeBehavior::class,
 *       ]);
 *   }
 *
 * Вся бизнес-логика (сумма, email, описание) — в модели через интерфейс SmlvChargeable.
 * Этот behavior только оркеструет вызов и не содержит SaaS-специфики.
 */
class SmlvChargeBehavior extends Behavior
{
    public function events(): array
    {
        return [
            ActiveRecord::EVENT_AFTER_INSERT => 'onAfterInsert',
        ];
    }

    public function onAfterInsert($event): void
    {
        $model = $this->owner;

        // Модель должна реализовывать интерфейс SmlvChargeable
        if (!($model instanceof SmlvChargeable)) {
            Yii::warning(
                get_class($model) . ' uses SmlvChargeBehavior but does not implement SmlvChargeable. Skipping charge.',
                'smlv'
            );
            return;
        }

        // SMLV компонент должен быть настроен (нет в консоли или dev-окружении без конфига)
        if (!Yii::$app->has('smlv')) {
            return;
        }

        $email = $model->getChargeEmail();
        if (empty($email)) {
            return;
        }

        $amount = $model->getChargeAmount();
        if ($amount === null || $amount <= 0) {
            return;
        }

        $description = $model->getChargeDescription();
        $metadata    = $model->getChargeMetadata();

        try {
            Yii::$app->smlv->billing->chargeByEmail($email, $amount, $description, $metadata);
        } catch (\Throwable $e) {
            Yii::error(
                'SmlvChargeBehavior: failed to charge ' . get_class($model) . ' #' . ($model->id ?? '?')
                . ' email=' . $email . ' amount=' . $amount . ': ' . $e->getMessage(),
                'smlv'
            );
        }
    }
}
