<?php

namespace Smlv\Sdk\Yii2;

use Yii;
use yii\base\Behavior;
use yii\db\ActiveRecord;

/**
 * Yii2 Behavior — автоматическое списание SMLV-депозита при сохранении модели.
 *
 * Настраивается через callable-свойства. Никакой SDK-интерфейс модели не навязывается.
 *
 * Пример:
 *
 *   public function behaviors(): array
 *   {
 *       return ArrayHelper::merge(parent::behaviors(), [
 *           'smlvCharge' => [
 *               'class'       => \Smlv\Sdk\Yii2\SmlvChargeBehavior::class,
 *               'email'       => fn() => $this->user->email,
 *               'amount'      => fn() => $this->price,
 *               'description' => fn() => 'Order #' . $this->id,
 *               'metadata'    => fn() => ['order_id' => $this->id],
 *           ],
 *       ]);
 *   }
 */
class SmlvChargeBehavior extends Behavior
{
    /** @var callable|string|null Email абонента для поиска депозита. */
    public $email = null;

    /** @var callable|float|null Сумма списания. null или <= 0 — пропустить. */
    public $amount = null;

    /** @var callable|string Описание транзакции. */
    public $description = '';

    /** @var callable|array Метаданные транзакции. */
    public $metadata = [];

    public function events(): array
    {
        return [
            ActiveRecord::EVENT_AFTER_INSERT => 'charge',
        ];
    }

    public function charge(): void
    {
        if (!Yii::$app->has('smlv')) {
            return;
        }

        $email = $this->resolve($this->email);
        if (empty($email)) {
            return;
        }

        $amount = $this->resolve($this->amount);
        if ($amount === null || (float) $amount <= 0) {
            return;
        }

        $description = $this->resolve($this->description);
        $metadata    = $this->resolve($this->metadata);

        try {
            Yii::$app->smlv->billing->chargeByEmail(
                $email,
                (float) $amount,
                (string) $description,
                (array) $metadata
            );
        } catch (\Throwable $e) {
            $model = $this->owner;
            Yii::error(
                'SmlvChargeBehavior: failed to charge ' . get_class($model) . ' #' . ($model->id ?? '?')
                . ' email=' . $email . ' amount=' . $amount . ': ' . $e->getMessage(),
                'smlv'
            );
        }
    }

    protected function resolve($value)
    {
        return is_callable($value) ? call_user_func($value) : $value;
    }
}
