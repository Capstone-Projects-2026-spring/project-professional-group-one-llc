-- Seed data matching src/data/roomContexts.js

insert into public.rooms (id, label, emoji, color, beacon_id)
values
  ('kitchen', 'Kitchen', '🍳', '#FF9F43', 'beacon-kitchen-001'),
  ('bathroom', 'Bathroom', '🚿', '#54A0FF', 'beacon-bathroom-001'),
  ('bedroom', 'Bedroom', '🛏️', '#5F27CD', 'beacon-bedroom-001'),
  ('livingRoom', 'Living Room', '🛋️', '#10AC84', 'beacon-livingroom-001'),
  ('classroom', 'Classroom', '🏫', '#EE5A24', 'beacon-classroom-001'),
  ('outside', 'Outside', '🌳', '#2ECC71', 'beacon-outside-001')
on conflict (id) do update
set
  label = excluded.label,
  emoji = excluded.emoji,
  color = excluded.color,
  beacon_id = excluded.beacon_id;

insert into public.word_labels (label, arasaac_id)
values
  ('Hungry', null),
  ('Thirsty', null),
  ('Eat', '6456'),
  ('Drink', '6061'),
  ('Water', '2248'),
  ('Snack', null),
  ('Cook', null),
  ('Hot', '2300'),
  ('Cold', null),
  ('More', null),
  ('All done', null),
  ('Help', null),
  ('Toilet', null),
  ('Wash hands', null),
  ('Brush teeth', null),
  ('Shower', null),
  ('Towel', null),
  ('Wait', null),
  ('Privacy', null),
  ('Tired', null),
  ('Wake up', null),
  ('Blanket', null),
  ('Light on', '8103'),
  ('Light off', '8027'),
  ('Read', null),
  ('Music', null),
  ('Quiet', null),
  ('Scared', null),
  ('Hug', null),
  ('Watch TV', null),
  ('Play', null),
  ('Sit', null),
  ('Relax', '2571'),
  ('Talk', null),
  ('Loud', null),
  ('Together', null),
  ('Teacher', null),
  ('Question', null),
  ('Yes', null),
  ('No', '5526'),
  ('Write', null),
  ('Listen', null),
  ('Break', null),
  ('Bathroom', '38625'),
  ('Done', null),
  ('More time', '11359'),
  ('Walk', '6044'),
  ('Run', '6465'),
  ('Swing', null),
  ('Go home', null),
  ('Stop', null),
  ('Look', null),
  ('Fun', null)
on conflict (label) do update
set arasaac_id = excluded.arasaac_id;

-- Kitchen
with room_words (label, position) as (
  values
    ('Hungry', 1),
    ('Thirsty', 2),
    ('Eat', 3),
    ('Drink', 4),
    ('Water', 5),
    ('Snack', 6),
    ('Cook', 7),
    ('Hot', 8),
    ('Cold', 9),
    ('More', 10),
    ('All done', 11),
    ('Help', 12)
)
insert into public.room_word_labels (room_id, word_label_id, position)
select 'kitchen', w.id, rw.position
from room_words rw
join public.word_labels w on w.label = rw.label
on conflict (room_id, word_label_id) do update
set position = excluded.position;

-- Bathroom
with room_words (label, position) as (
  values
    ('Toilet', 1),
    ('Wash hands', 2),
    ('Brush teeth', 3),
    ('Shower', 4),
    ('Towel', 5),
    ('Help', 6),
    ('All done', 7),
    ('Wait', 8),
    ('Privacy', 9)
)
insert into public.room_word_labels (room_id, word_label_id, position)
select 'bathroom', w.id, rw.position
from room_words rw
join public.word_labels w on w.label = rw.label
on conflict (room_id, word_label_id) do update
set position = excluded.position;

-- Bedroom
with room_words (label, position) as (
  values
    ('Tired', 1),
    ('Drink', 2),
    ('Wake up', 3),
    ('Blanket', 4),
    ('Light on', 5),
    ('Light off', 6),
    ('Read', 7),
    ('Music', 8),
    ('Quiet', 9),
    ('Help', 10),
    ('Scared', 11),
    ('Hug', 12)
)
insert into public.room_word_labels (room_id, word_label_id, position)
select 'bedroom', w.id, rw.position
from room_words rw
join public.word_labels w on w.label = rw.label
on conflict (room_id, word_label_id) do update
set position = excluded.position;

-- Living Room
with room_words (label, position) as (
  values
    ('Watch TV', 1),
    ('Play', 2),
    ('Music', 3),
    ('Sit', 4),
    ('Relax', 5),
    ('Talk', 6),
    ('Snack', 7),
    ('Read', 8),
    ('Loud', 9),
    ('Quiet', 10),
    ('Together', 11),
    ('Help', 12)
)
insert into public.room_word_labels (room_id, word_label_id, position)
select 'livingRoom', w.id, rw.position
from room_words rw
join public.word_labels w on w.label = rw.label
on conflict (room_id, word_label_id) do update
set position = excluded.position;

-- Classroom
with room_words (label, position) as (
  values
    ('Teacher', 1),
    ('Question', 2),
    ('Help', 3),
    ('Yes', 4),
    ('No', 5),
    ('Read', 6),
    ('Write', 7),
    ('Listen', 8),
    ('Break', 9),
    ('Bathroom', 10),
    ('Done', 11),
    ('More time', 12)
)
insert into public.room_word_labels (room_id, word_label_id, position)
select 'classroom', w.id, rw.position
from room_words rw
join public.word_labels w on w.label = rw.label
on conflict (room_id, word_label_id) do update
set position = excluded.position;

-- Outside
with room_words (label, position) as (
  values
    ('Walk', 1),
    ('Run', 2),
    ('Play', 3),
    ('Swing', 4),
    ('Hot', 5),
    ('Cold', 6),
    ('Water', 7),
    ('Go home', 8),
    ('Stop', 9),
    ('Look', 10),
    ('Fun', 11),
    ('Help', 12)
)
insert into public.room_word_labels (room_id, word_label_id, position)
select 'outside', w.id, rw.position
from room_words rw
join public.word_labels w on w.label = rw.label
on conflict (room_id, word_label_id) do update
set position = excluded.position;
