<?php

namespace Database\Factories;

use App\Models\Visitor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Visitor>
 */
class VisitorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $purposes = ['Meeting', 'Interview', 'Delivery', 'Maintenance', 'Contractor', 'Tour'];

        return [
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->numerify('+1-###-###-####'),
            'company' => fake()->company(),
            'host' => fake()->name(),
            'purpose' => fake()->randomElement($purposes),
            'badge_number' => 'VIS-'.date('Y').'-'.str_pad((string) fake()->unique()->numberBetween(1, 999999999), 9, '0', STR_PAD_LEFT),
            'qr_token' => (string) \Illuminate\Support\Str::ulid(),
            'status' => 'expected',
            'checked_in_at' => null,
            'checked_out_at' => null,
        ];
    }

    /**
     * Visitor is currently on-site (checked in, not yet out).
     */
    public function checkedIn(): static
    {
        return $this->state(function () {
            $in = fake()->dateTimeBetween('-6 hours', '-10 minutes');

            return [
                'status' => 'checked_in',
                'checked_in_at' => $in,
                'checked_out_at' => null,
            ];
        });
    }

    /**
     * Visitor has completed their visit.
     */
    public function checkedOut(): static
    {
        return $this->state(function () {
            $in = fake()->dateTimeBetween('-2 days', '-4 hours');
            $out = fake()->dateTimeBetween($in, '-1 hour');

            return [
                'status' => 'checked_out',
                'checked_in_at' => $in,
                'checked_out_at' => $out,
            ];
        });
    }
}
