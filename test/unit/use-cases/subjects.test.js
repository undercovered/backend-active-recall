const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const CreateSubject = require('../../../src/application/use-cases/CreateSubject');
const GetAllSubjects = require('../../../src/application/use-cases/GetAllSubjects');
const GetSubjectById = require('../../../src/application/use-cases/GetSubjectById');
const UpdateSubject = require('../../../src/application/use-cases/UpdateSubject');
const DeleteSubject = require('../../../src/application/use-cases/DeleteSubject');
const Subject = require('../../../src/domain/entities/Subject');
const ValidationError = require('../../../src/domain/errors/ValidationError');
const NotFoundError = require('../../../src/domain/errors/NotFoundError');

function memorySubjects(seed = []) {
  const items = [...seed];
  return {
    items,
    async findAll({ search } = {}) {
      const term = (search || '').trim().toLowerCase();
      return items.filter(
        (s) => !s.deleted && (!term || s.title.toLowerCase().includes(term)),
      );
    },
    async findById(id) {
      return items.find((s) => s.id === id && !s.deleted) ?? null;
    },
    async create({ title, description }) {
      const s = new Subject({
        id: `s-${items.length + 1}`,
        title,
        description,
        createdAt: 'now',
        updatedAt: 'now',
      });
      items.unshift(s);
      return s;
    },
    async update(id, { title, description }) {
      const idx = items.findIndex((s) => s.id === id);
      if (idx < 0) return null;
      items[idx] = new Subject({
        ...items[idx],
        title: title ?? items[idx].title,
        description: description ?? items[idx].description,
      });
      return items[idx];
    },
    async delete(id) {
      const item = items.find((s) => s.id === id && !s.deleted);
      if (!item) return false;
      item.deleted = true;
      return true;
    },
  };
}

describe('Subject use cases', () => {
  test('CreateSubject persists a normalized title', async () => {
    const repo = memorySubjects();
    const created = await new CreateSubject({ subjectRepository: repo }).execute({
      title: '  Java  ',
      description: 'OOP',
    });
    assert.equal(created.title, 'Java');
    assert.equal(repo.items.length, 1);
  });

  test('CreateSubject rejects blank title before hitting the repo', async () => {
    const repo = memorySubjects();
    await assert.rejects(
      () => new CreateSubject({ subjectRepository: repo }).execute({ title: '' }),
      ValidationError,
    );
    assert.equal(repo.items.length, 0);
  });

  test('GetAllSubjects forwards search', async () => {
    const repo = memorySubjects([
      new Subject({ id: '1', title: 'Java' }),
      new Subject({ id: '2', title: 'Python' }),
    ]);
    const all = await new GetAllSubjects({ subjectRepository: repo }).execute({});
    assert.equal(all.length, 2);
    const filtered = await new GetAllSubjects({ subjectRepository: repo }).execute({
      search: 'jav',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].title, 'Java');
  });

  test('GetSubjectById throws 404 when missing', async () => {
    const repo = memorySubjects();
    await assert.rejects(
      () => new GetSubjectById({ subjectRepository: repo }).execute('nope'),
      NotFoundError,
    );
  });

  test('GetSubjectById returns the entity', async () => {
    const repo = memorySubjects([new Subject({ id: '1', title: 'Java' })]);
    const found = await new GetSubjectById({ subjectRepository: repo }).execute('1');
    assert.equal(found.title, 'Java');
  });

  test('UpdateSubject merges fields and validates title', async () => {
    const repo = memorySubjects([
      new Subject({ id: '1', title: 'Java', description: 'old' }),
    ]);
    const uc = new UpdateSubject({ subjectRepository: repo });
    const updated = await uc.execute('1', { description: 'new' });
    assert.equal(updated.title, 'Java');
    assert.equal(updated.description, 'new');

    await assert.rejects(() => uc.execute('1', { title: '  ' }), ValidationError);
    await assert.rejects(() => uc.execute('missing', { title: 'X' }), NotFoundError);
  });

  test('DeleteSubject throws when nothing was deleted', async () => {
    const repo = memorySubjects();
    await assert.rejects(
      () => new DeleteSubject({ subjectRepository: repo }).execute('x'),
      NotFoundError,
    );
  });

  test('DeleteSubject returns the id', async () => {
    const repo = memorySubjects([new Subject({ id: '1', title: 'Java' })]);
    const result = await new DeleteSubject({ subjectRepository: repo }).execute('1');
    assert.deepEqual(result, { id: '1' });
    assert.equal(repo.items.length, 1);
    assert.equal(repo.items[0].deleted, true);
    assert.equal(await repo.findById('1'), null);
  });
});
